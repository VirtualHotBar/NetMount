import { DefaultParams } from "../../../../type/rclone/storage/defaults";

interface DropboxParamsStandard {
    client_id?: string;
    client_secret?: string;
  }
  
  interface DropboxParamsAdvanced {
    chunk_size?: number;
    impersonate?: string;
  }
  
  const standard: DropboxParamsStandard = {
    client_id: "",
    client_secret: "",
  }
  
  const advanced: DropboxParamsAdvanced = {
    chunk_size: 50331648, // 48MB
    impersonate: "",
  }
  
  const dropboxDefaults: DefaultParams = {
    "name": "Dropbox",
    "standard": standard,
    "advanced": advanced,
    required:["client_id", "client_secret"]
  }

  export{dropboxDefaults}