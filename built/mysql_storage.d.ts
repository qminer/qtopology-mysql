import * as qtopology from "qtopology";
export interface MySqlStorageParams {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    retries: number;
    retry_timeout: number;
}
export interface MySqlTopologyManager {
    insert(uuid: string, config: any, overwrite: boolean, callback: qtopology.SimpleCallback): any;
}
export declare class MySqlStorage implements qtopology.CoordinationStorage {
    private pool;
    private name;
    private options;
    private next_refresh;
    constructor(options: MySqlStorageParams);
    init(callback: qtopology.SimpleCallback): void;
    close(callback: qtopology.SimpleCallback): void;
    private log(s);
    static retry(times: number, timeout: number, isRetriableError: (e: Error) => boolean, step: (cb: qtopology.SimpleResultCallback<any>) => void, callback: qtopology.SimpleResultCallback<any>): void;
    private query(sql, obj, callback);
    getMessages(name: string, callback: qtopology.SimpleResultCallback<qtopology.StorageResultMessage[]>): void;
    getMessage(name: string, callback: qtopology.SimpleResultCallback<qtopology.StorageResultMessage>): void;
    getWorkerStatusInternal(callback: qtopology.SimpleResultCallback<qtopology.WorkerStatus[]>): void;
    getWorkerStatus(callback: qtopology.SimpleResultCallback<qtopology.WorkerStatus[]>): void;
    private getTopologyStatusInternal(sql, obj, callback);
    getTopologyStatus(callback: qtopology.SimpleResultCallback<qtopology.TopologyStatus[]>): void;
    getTopologiesForWorker(name: string, callback: qtopology.SimpleResultCallback<qtopology.TopologyStatus[]>): void;
    getTopologyInfo(uuid: string, callback: qtopology.SimpleResultCallback<qtopology.TopologyInfoResponse>): void;
    registerWorker(name: string, callback: qtopology.SimpleCallback): void;
    pingWorker(name: string, callback?: qtopology.SimpleCallback): void;
    announceLeaderCandidacy(name: string, callback: qtopology.SimpleCallback): void;
    checkLeaderCandidacy(name: string, callback: qtopology.SimpleResultCallback<boolean>): void;
    assignTopology(uuid: string, name: string, callback: qtopology.SimpleCallback): void;
    setTopologyStatus(uuid: string, status: string, error: string, callback: qtopology.SimpleCallback): void;
    setTopologyPid(uuid: string, pid: number, callback: qtopology.SimpleCallback): void;
    setWorkerStatus(name: string, status: string, callback: qtopology.SimpleCallback): void;
    setWorkerLStatus(name: string, lstatus: string, callback: qtopology.SimpleCallback): void;
    registerTopology(uuid: string, config: any, callback: qtopology.SimpleCallback): void;
    disableTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    enableTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    deleteTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    getProperties(callback: qtopology.SimpleResultCallback<qtopology.StorageProperty[]>): any;
    sendMessageToWorker(worker: string, cmd: string, content: any, valid_msec: number, callback: qtopology.SimpleCallback): void;
    getMsgQueueContent(callback: qtopology.SimpleResultCallback<qtopology.MsgQueueItem[]>): void;
    private stopTopologyInternal(uuid, do_kill, callback);
    stopTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    killTopology(uuid: string, callback: qtopology.SimpleCallback): void;
    clearTopologyError(uuid: string, callback: qtopology.SimpleCallback): void;
    deleteWorker(name: string, callback: qtopology.SimpleCallback): void;
    shutDownWorker(name: string, callback: qtopology.SimpleCallback): void;
    getTopologyHistory(uuid: string, callback: qtopology.SimpleResultCallback<qtopology.TopologyStatusHistory[]>): void;
    getWorkerHistory(name: string, callback: qtopology.SimpleResultCallback<qtopology.WorkerStatusHistory[]>): void;
}
