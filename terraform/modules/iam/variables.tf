variable "name_prefix" {
  type = string
}

variable "create" {
  description = "Create a Lambda execution role. Set false in AWS Academy and use LabRole instead."
  type        = bool
}

variable "existing_role_arn" {
  description = "Used when create is false."
  type        = string
  default     = null
}

variable "dynamodb_table_arns" {
  type = list(string)
}

variable "audio_bucket_arn" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
