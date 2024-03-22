interface LocalDiskParameters {
  nounc: boolean;
  copy_links: boolean;
  links: boolean;
  skip_links: boolean;
  zero_size_links: boolean;
  unicode_normalization: boolean;
  no_check_updated: boolean;
  one_file_system: boolean;
  case_sensitive: boolean;
  case_insensitive: boolean;
  no_preallocate: boolean;
  no_sparse: boolean;
  no_set_modtime: boolean;
  encoding:  "Slash,Dot"|string; // Consider defining an enum for valid encodings,Slash,Dot
  description?: string;
}

export {LocalDiskParameters}