import { FragmentsGroup } from "bim-fragment";
import { Disposable, FragmentIdMap, Component, Event } from "../../base-types";
import { Components } from "../../core";
export interface Classification {
    [system: string]: {
        [className: string]: FragmentIdMap;
    };
}
export declare class FragmentClassifier extends Component<Classification> implements Disposable {
    static readonly uuid: "e25a7f3c-46c4-4a14-9d3d-5115f24ebeb7";
    /** {@link Component.enabled} */
    enabled: boolean;
    private _groupSystems;
    /** {@link Disposable.onDisposed} */
    readonly onDisposed: Event<string>;
    constructor(components: Components);
    private onFragmentsDisposed;
    /** {@link Component.get} */
    get(): Classification;
    dispose(): Promise<void>;
    remove(guid: string): void;
    find(filter?: {
        [name: string]: string[];
    }): FragmentIdMap;
    byModel(modelID: string, group: FragmentsGroup): void;
    byPredefinedType(group: FragmentsGroup): Promise<void>;
    byEntity(group: FragmentsGroup): void;
    byStorey(group: FragmentsGroup): void;
    byIfcRel(group: FragmentsGroup, ifcRel: number, systemName: string): Promise<void>;
    private saveItem;
}