import * as qtopology from "./qtopology";
export { DbUpgrader } from "./db_updater";
export interface IMySqlStorageParams {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    retries?: number;
    retry_timeout?: number;
    db_check_only?: boolean;
}
export interface IMySqlTopologyManager {
    insert(uuid: string, config: any, overwrite: boolean, callback: qtopology.SimpleCallback): any;
}
export declare class MySqlStorage implements qtopology.ICoordinationStorage {
    static retry(times: number, timeout: number, isRetriableError: (e: Error) => boolean, step: (cb: qtopology.SimpleResultCallback<any>) => void, callback: qtopology.SimpleResultCallback<any>): void;
    private pool;
    private name;
    private options;
    private next_refresh;
    private db_check_only;
    constructor(options: IMySqlStorageParams);
    init(callback: qtopology.SimpleCallback): void;
    close(callback: qtopology.SimpleCallback): void;
    getMessages(name: string, callback: qtopology.SimpleResultCallback<qtopology.IStorageResultMessage[]>): void;
    getMessage(name: string, callback: qtopology.SimpleResultCallback<qtopology.IStorageResultMessage>): void;
    getWorkerStatusInternal(callback: qtopology.SimpleResultCallback<qtopology.IWorkerStatus[]>): void;
    getWorkerStatus(callback: qtopology.SimpleResultCallback<qtopology.IWorkerStatus[]>): void;
    getTopologyStatus(callback: qtopology.SimpleResultCallback<qtopology.ITopologyStatus[]>): void;
    getTopologiesForWorker(name: string, callback: qtopology.SimpleResultCallback<qtopology.ITopologyStatus[]>): void;
    getTopologyInfo(uuid: string, callback: qtopology.SimpleResultCallback<qtopology.ITopologyInfoResponse>): void;
    registerWorker(name: string, callback: qtopology.SimpleCallback): void;
    pingWorker(name: string, callback?: qtopology.SimpleCallback): void;
    announceLeaderCandidacy(name: string, callback: qtopology.SimpleCallback): void;
    checkLeaderCandidacy(name: string, callback: qtopology.SimpleResultCallback<boolean>): void;
    assignTopology(uuid: string, name: string, callback: qtopology.SimpleCallback): void;
    setTopologyStatus(uuid: string, worker: string, status: string, error: string, callback: qtopology.SimpleCallback): void;
    setTopologyPid(uuid: string, pid: number, callback: qtopology.SimpleCallback): void;
    setWorkerStatus(name: string, status: string, callback: qtopology.SimpleCallback): void;
    setWorkerLStatus(name: string, lstatus: string, callback: qtopology.SimpleCallback): void;
    registerTopology(uuid: string, config: any, callback: qtopology.SimpleCallback): void;
    disableTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    enableTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    deleteTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    getProperties(callback: qtopology.SimpleResultCallback<qtopology.IStorageProperty[]>): any;
    sendMessageToWorker(worker: string, cmd: string, content: any, valid_msec: number, callback: qtopology.SimpleCallback): void;
    getMsgQueueContent(callback: qtopology.SimpleResultCallback<qtopology.IMsgQueueItem[]>): void;
    stopTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    killTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    clearTopologyError(uuid: string, callback: qtopology.SimpleCallback): void;
    deleteWorker(name: string, callback: qtopology.SimpleCallback): void;
    shutDownWorker(name: string, callback: qtopology.SimpleCallback): void;
    getTopologyHistory(uuid: string, callback: qtopology.SimpleResultCallback<qtopology.ITopologyStatusHistory[]>): void;
    getWorkerHistory(name: string, callback: qtopology.SimpleResultCallback<qtopology.IWorkerStatusHistory[]>): void;
    private log;
    private query;
    private getTopologyStatusInternal;
    private stopTopologyInternal;
}
