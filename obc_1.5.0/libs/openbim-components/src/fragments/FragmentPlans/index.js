import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import { Component, Event, UIElement } from "../../base-types";
import { IfcPropertiesUtils } from "../../ifc";
import { PlanObjects } from "./src/plan-objects";
import { ToolComponent } from "../../core";
import { Button, FloatingWindow, SimpleUICard, SimpleUIComponent, Toolbar, CommandsMenu, } from "../../ui";
import { EdgesClipper, EdgesPlane } from "../../navigation/EdgesClipper";
/**
 * Helper to control the camera and easily define and navigate 2D floor plans.
 */
export class FragmentPlans extends Component {
    get commands() {
        return this.uiElement.get("commandsMenu").commands;
    }
    set commands(commands) {
        this.uiElement.get("commandsMenu").commands =
            commands;
    }
    constructor(components) {
        super(components);
        /** {@link Disposable.onDisposed} */
        this.onDisposed = new Event();
        this.onNavigated = new Event();
        this.onExited = new Event();
        /** {@link Component.enabled} */
        this.enabled = false;
        /** The floorplan that is currently selected. */
        this.currentPlan = null;
        /** The offset from the clipping planes to their respective floor plan elevation. */
        this.defaultSectionOffset = 1.5;
        /** The offset of the 2D camera to the floor plan elevation. */
        this.defaultCameraOffset = 30;
        /** The created floor plans. */
        this.storeys = [];
        /** {@link UI.uiElement} */
        this.uiElement = new UIElement();
        this._plans = [];
        this._floorPlanViewCached = false;
        this._previousCamera = new THREE.Vector3();
        this._previousTarget = new THREE.Vector3();
        this._previousProjection = "Perspective";
        this.components.tools.add(FragmentPlans.uuid, this);
        this.objects = new PlanObjects(components);
        if (components.uiEnabled) {
            this.setUI(components);
        }
    }
    /** {@link Component.get} */
    get() {
        return this._plans;
    }
    /** {@link Disposable.dispose} */
    async dispose() {
        this.onExited.reset();
        this.onNavigated.reset();
        this.storeys = [];
        this._plans = [];
        await this.objects.dispose();
        await this.uiElement.dispose();
        await this.onDisposed.trigger(FragmentPlans.uuid);
        this.onDisposed.reset();
    }
    // TODO: Compute georreference matrix when generating fragmentsgroup
    // so that we can correctly add floors in georreferenced models
    // where the IfcSite / IfcBuilding have location information
    async computeAllPlanViews(model) {
        if (!model.hasProperties) {
            throw new Error("Properties are needed to compute plan views!");
        }
        const floorsProps = await model.getAllPropertiesOfType(WEBIFC.IFCBUILDINGSTOREY);
        if (!floorsProps) {
            throw new Error("Floorplans not found!");
        }
        const coordHeight = model.coordinationMatrix.elements[13];
        const units = await IfcPropertiesUtils.getUnits(model);
        for (const floor of Object.values(floorsProps)) {
            const floorHeight = { value: 0 };
            this.getAbsoluteFloorHeight(floor.ObjectPlacement, floorHeight);
            const height = floorHeight.value * units + coordHeight;
            await this.create({
                name: floor.Name.value,
                id: floor.GlobalId.value,
                normal: new THREE.Vector3(0, -1, 0),
                point: new THREE.Vector3(0, height, 0),
                ortho: true,
                offset: this.defaultSectionOffset,
            });
        }
        const { min, max } = model.boundingBox;
        this.objects.setBounds([min, max]);
    }
    /**
     * Creates a new floor plan in the navigator.
     *
     * @param config - Necessary data to initialize the floor plan.
     */
    async create(config) {
        const previousPlan = this._plans.find((plan) => plan.id === config.id);
        if (previousPlan) {
            console.warn(`There's already a plan with the id: ${config.id}`);
            return;
        }
        const plane = await this.createClippingPlane(config);
        plane.visible = false;
        const plan = { ...config, plane };
        this._plans.push(plan);
        this.objects.add(config);
    }
    /**
     * Make the navigator go to the specified floor plan.
     *
     * @param id - Floor plan to go to.
     * @param animate - Whether to animate the camera transition.
     */
    async goTo(id, animate = false) {
        if (this.currentPlan?.id === id) {
            return;
        }
        this.objects.visible = false;
        await this.onNavigated.trigger({ id });
        this.storeCameraPosition();
        await this.hidePreviousClippingPlane();
        this.updateCurrentPlan(id);
        await this.activateCurrentPlan();
        if (!this.enabled) {
            await this.moveCameraTo2DPlanPosition(animate);
            this.enabled = true;
        }
        if (this.components.uiEnabled) {
            this.uiElement.get("exitButton").enabled = true;
        }
    }
    /**
     * Deactivate navigator and go back to the previous view.
     *
     * @param animate - Whether to animate the camera transition.
     */
    async exitPlanView(animate = false) {
        if (!this.enabled)
            return;
        this.enabled = false;
        await this.onExited.trigger();
        this.cacheFloorplanView();
        const camera = this.components.camera;
        camera.setNavigationMode("Orbit");
        await camera.setProjection(this._previousProjection);
        if (this.currentPlan && this.currentPlan.plane) {
            await this.currentPlan.plane.setEnabled(false);
            await this.currentPlan.plane.edges.setVisible(false);
        }
        this.currentPlan = null;
        await camera.controls.setLookAt(this._previousCamera.x, this._previousCamera.y, this._previousCamera.z, this._previousTarget.x, this._previousTarget.y, this._previousTarget.z, animate);
        if (this.components.uiEnabled) {
            this.uiElement.get("exitButton").enabled = false;
        }
    }
    async updatePlansList() {
        if (!this.components.uiEnabled) {
            return;
        }
        const defaultText = this.uiElement.get("defaultText");
        const planList = this.uiElement.get("planList");
        const commandsMenu = this.uiElement.get("commandsMenu");
        await planList.dispose(true);
        if (!this._plans.length) {
            defaultText.visible = true;
            return;
        }
        defaultText.visible = false;
        commandsMenu.update();
        const commandsExist = commandsMenu.hasCommands;
        for (const plan of this._plans) {
            const height = Math.trunc(plan.point.y * 10) / 10;
            const description = `Height: ${height}`;
            const simpleCard = new SimpleUICard(this.components);
            simpleCard.title = plan.name;
            simpleCard.description = description;
            const toolbar = new Toolbar(this.components);
            this.components.ui.addToolbar(toolbar);
            simpleCard.addChild(toolbar);
            toolbar.domElement.classList.remove("shadow-md", "backdrop-blur-xl", "bg-ifcjs-100");
            const planButton = new Button(this.components, {
                materialIconName: "arrow_outward",
            });
            planButton.onClick.add(async () => {
                await this.goTo(plan.id);
            });
            toolbar.addChild(planButton);
            const extraButton = new Button(this.components, {
                materialIconName: "expand_more",
            });
            extraButton.onClick.add((event) => {
                if (event) {
                    commandsMenu.commandData = plan;
                    commandsMenu.popup(event.x, event.y);
                }
            });
            if (!commandsExist) {
                extraButton.enabled = false;
            }
            toolbar.addChild(extraButton);
            simpleCard.domElement.classList.remove("bg-ifcjs-120");
            simpleCard.domElement.classList.remove("border-transparent");
            simpleCard.domElement.className += ` min-w-[300px] my-2 border-1 border-solid border-[#3A444E] `;
            planList.addChild(simpleCard);
        }
    }
    setUI(components) {
        this.setupPlanObjectUI();
        const topButtonContainer = new SimpleUIComponent(this.components, `<div class="flex"></div>`);
        const exitButton = new Button(components);
        exitButton.materialIcon = "logout";
        topButtonContainer.addChild(exitButton);
        exitButton.enabled = false;
        exitButton.onClick.add(() => this.exitPlanView());
        const main = new Button(components, {
            tooltip: "Plans list",
        });
        main.materialIcon = "folder_copy";
        const floatingWindow = new FloatingWindow(components);
        floatingWindow.title = "Floor Plans";
        components.ui.add(floatingWindow);
        floatingWindow.visible = false;
        floatingWindow.addChild(topButtonContainer);
        const planList = new SimpleUIComponent(components, `<div class="flex flex-col"></div>`);
        floatingWindow.addChild(planList);
        const defaultText = new SimpleUIComponent(components, `<p>No plans yet.</p>`);
        floatingWindow.addChild(defaultText);
        const commandsMenu = new CommandsMenu(components);
        components.ui.add(commandsMenu);
        commandsMenu.visible = false;
        this.uiElement.set({
            main,
            floatingWindow,
            planList,
            defaultText,
            exitButton,
            commandsMenu,
        });
        main.onClick.add(() => {
            floatingWindow.visible = !floatingWindow.visible;
        });
    }
    storeCameraPosition() {
        if (this.enabled) {
            this.cacheFloorplanView();
        }
        else {
            this.store3dCameraPosition();
        }
    }
    async createClippingPlane(config) {
        const { normal, point } = config;
        const clippingPoint = point.clone();
        if (config.offset) {
            clippingPoint.y += config.offset;
        }
        const clipper = this.components.tools.get(EdgesClipper);
        const plane = clipper.createFromNormalAndCoplanarPoint(normal, clippingPoint);
        await plane.setEnabled(false);
        await plane.edges.update();
        await plane.edges.setVisible(false);
        return plane;
    }
    cacheFloorplanView() {
        this._floorPlanViewCached = true;
        const camera = this.components.camera;
        camera.controls.saveState();
    }
    async moveCameraTo2DPlanPosition(animate) {
        const camera = this.components.camera;
        if (this._floorPlanViewCached) {
            await camera.controls.reset(animate);
        }
        else {
            await camera.controls.setLookAt(0, 100, 0, 0, 0, 0, animate);
        }
    }
    async activateCurrentPlan() {
        if (!this.currentPlan)
            throw new Error("Current plan is not defined.");
        const camera = this.components.camera;
        if (this.currentPlan.plane) {
            await this.currentPlan.plane.setEnabled(true);
            this.currentPlan.plane.edges.fillNeedsUpdate = true;
            await this.currentPlan.plane.edges.setVisible(true);
        }
        camera.setNavigationMode("Plan");
        const projection = this.currentPlan.ortho ? "Orthographic" : "Perspective";
        await camera.setProjection(projection);
    }
    store3dCameraPosition() {
        const camera = this.components.camera;
        const activeCamera = this.components.camera.get();
        activeCamera.getWorldPosition(this._previousCamera);
        camera.controls.getTarget(this._previousTarget);
        this._previousProjection = camera.getProjection();
    }
    updateCurrentPlan(id) {
        const foundPlan = this._plans.find((plan) => plan.id === id);
        if (!foundPlan) {
            throw new Error("The specified plan is undefined!");
        }
        this.currentPlan = foundPlan;
    }
    async hidePreviousClippingPlane() {
        if (this.currentPlan) {
            const plane = this.currentPlan.plane;
            if (plane) {
                await plane.setEnabled(false);
            }
            if (this.currentPlan.plane instanceof EdgesPlane) {
                await this.currentPlan.plane.edges.setVisible(false);
            }
        }
    }
    setupPlanObjectUI() {
        this.objects.planClicked.add(async ({ id }) => {
            const button = this.objects.uiElement.get("main");
            if (!this.enabled) {
                if (button.innerElements.icon && button.innerElements.tooltip) {
                    button.materialIcon = "logout";
                    button.tooltip = "Exit floorplans";
                }
                button.onClick.add(() => {
                    this.exitPlanView();
                    if (button.innerElements.icon && button.innerElements.tooltip) {
                        button.materialIcon = "layers";
                        button.tooltip = "3D plans";
                    }
                    button.onClick.add(() => (this.objects.visible = !this.objects.visible));
                });
            }
            this.goTo(id);
        });
    }
    getAbsoluteFloorHeight(placement, height) {
        const coords = placement.RelativePlacement.Location.Coordinates;
        height.value += coords[2].value;
        if (placement.PlacementRelTo) {
            this.getAbsoluteFloorHeight(placement.PlacementRelTo, height);
        }
    }
}
FragmentPlans.uuid = "a80874aa-1c93-43a4-80f2-df346da086b1";
ToolComponent.libraryUUIDs.add(FragmentPlans.uuid);
//# sourceMappingURL=index.js.map