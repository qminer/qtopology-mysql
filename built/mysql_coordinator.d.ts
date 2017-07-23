import * as qtopology from "qtopology";
export interface MySqlCoordinatorParams {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}
export interface MySqlTopologyManager {
    insert(uuid: string, config: any, overwrite: boolean, callback: qtopology.SimpleCallback): any;
}
export declare class MySqlCoordinator implements qtopology.CoordinationStorage {
    private pool;
    private name;
    private options;
    constructor(options: MySqlCoordinatorParams);
    init(callback: qtopology.SimpleCallback): void;
    close(callback: qtopology.SimpleCallback): void;
    private log(s);
    private query(sql, obj, callback);
    getMessages(name: string, callback: qtopology.SimpleResultCallback<qtopology.StorageResultMessage[]>): void;
    getWorkerStatus(callback: qtopology.SimpleResultCallback<qtopology.LeadershipResultWorkerStatus[]>): void;
    private getTopologyStatusInternal(sql, obj, callback);
    getTopologyStatus(callback: qtopology.SimpleResultCallback<qtopology.LeadershipResultTopologyStatus[]>): void;
    getTopologiesForWorker(name: string, callback: qtopology.SimpleResultCallback<qtopology.LeadershipResultTopologyStatus[]>): void;
    getTopologyInfo(uuid: string, callback: qtopology.SimpleResultCallback<qtopology.TopologyInfoResponse>): void;
    getLeadershipStatus(callback: qtopology.SimpleResultCallback<qtopology.LeadershipResultStatus>): void;
    registerWorker(name: string, callback: qtopology.SimpleCallback): void;
    announceLeaderCandidacy(name: string, callback: qtopology.SimpleCallback): void;
    checkLeaderCandidacy(name: string, callback: qtopology.SimpleResultCallback<boolean>): void;
    assignTopology(uuid: string, name: string, callback: qtopology.SimpleCallback): void;
    setTopologyStatus(uuid: string, status: string, error: string, callback: qtopology.SimpleCallback): void;
    setWorkerStatus(name: string, status: string, callback: qtopology.SimpleCallback): void;
    registerTopology(uuid: string, config: any, callback: qtopology.SimpleCallback): void;
    disableTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    enableTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    deleteTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    getProperties(callback: qtopology.SimpleResultCallback<qtopology.StorageProperty[]>): any;
    sendMessageToWorker(worker: string, cmd: string, content: any, callback: qtopology.SimpleCallback): void;
    stopTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    clearTopologyError(uuid: string, callback: qtopology.SimpleCallback): void;
    deleteWorker(name: string, callback: qtopology.SimpleCallback): void;
    shutDownWorker(name: string, callback: qtopology.SimpleCallback): void;
}
