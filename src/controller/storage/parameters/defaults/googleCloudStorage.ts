import { DefaultParams, ParamsSelectType } from "../../../../type/rclone/storage/defaults";


interface GoogleCloudStorageParamsStandard {
  client_id?: string;
  client_secret?: string;
  project_number?: string;
  user_project?: string;
  service_account_file?: string;
  service_account_credentials?: string;
  anonymous?: boolean;
  object_acl?: ParamsSelectType;
  bucket_acl?: ParamsSelectType;
  bucket_policy_only?: boolean;
  location?: string;
  storage_class?: ParamsSelectType;
  env_auth?: boolean;
}

interface GoogleCloudStorageParamsAdvanced {
  token?: string;
  auth_url?: string;
  token_url?: string;
  directory_markers?: boolean;
  no_check_bucket?: boolean;
  decompress?: boolean;
  endpoint?: string;
  encoding?: string;
  description?: string;
}

const standard: GoogleCloudStorageParamsStandard = {
  client_id: "",
  client_secret: "",
  project_number: "",
  user_project: "",
  service_account_file: "",
  service_account_credentials: "",
  anonymous: false,
  object_acl: {
    select: 'private',
    values: ['authenticatedRead', 'bucketOwnerFullControl', 'bucketOwnerRead', 'private', 'projectPrivate', 'publicRead']
  },
  bucket_acl: {
    select: 'private',
    values: ['authenticatedRead', 'private', 'projectPrivate', 'publicRead', 'publicReadWrite']
  },
  bucket_policy_only: false,
  location: "",
  storage_class: {
    select: 'STANDARD',
    values: ['MULTI_REGIONAL', 'REGIONAL', 'NEARLINE', 'COLDLINE', 'ARCHIVE', 'DURABLE_REDUCED_AVAILABILITY', 'STANDARD']
  },
  env_auth: false,
}

const advanced: GoogleCloudStorageParamsAdvanced = {
  token: "",
  auth_url: "",
  token_url: "",
  directory_markers: false,
  no_check_bucket: false,
  decompress: false,
  endpoint: "",
  encoding: "Slash,CrLf,InvalidUtf8,Dot",
  description: ""
}

const googleCloudStorageDefaults: DefaultParams = {
  "name": "GoogleCloudStorage",
  "standard": standard,
  "advanced": advanced,
  "required": []
}

export{googleCloudStorageDefaults}