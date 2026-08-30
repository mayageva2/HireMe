variable "name_prefix" {
  type = string
}

variable "api_endpoint" {
  type = string
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

variable "iam_service_role_arn" {
  description = "Amplify IAM service role. Required when the app was connected to GitHub in the console."
  type        = string
  default     = ""
}

variable "connect_repository" {
  description = "Attach the GitHub repo and create the branch. Requires github_access_token."
  type        = bool
  default     = false
}

variable "github_repository" {
  type    = string
  default = ""
}

variable "github_access_token" {
  type      = string
  default   = ""
  sensitive = true
}

variable "branch_name" {
  type    = string
  default = "may-dev"
}

variable "tags" {
  type    = map(string)
  default = {}
}
