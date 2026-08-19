variable "aws_region" {
  description = "AWS region used by the Academy lab."
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Local AWS CLI profile. Credentials are never stored in Terraform."
  type        = string
  default     = "default"
}

variable "project_name" {
  type    = string
  default = "hireme"
}

variable "environment" {
  type    = string
  default = "lab"
}

variable "academy_role_name" {
  description = "Existing AWS Academy execution role used when lambda_role_arn is null."
  type        = string
  default     = "LabRole"
}

variable "lambda_role_arn" {
  description = "Optional execution role ARN. Leave null to look up the AWS Academy LabRole."
  type        = string
  default     = null
}

variable "livekit_url" {
  description = "LiveKit websocket URL, for example wss://example.livekit.cloud."
  type        = string
}

variable "livekit_api_key" {
  type      = string
  sensitive = true
}

variable "livekit_api_secret" {
  type      = string
  sensitive = true
}

variable "openai_api_key" {
  description = "Optional. The CV Lambda uses its built-in mock fallback when empty."
  type        = string
  sensitive   = true
  default     = ""
}

variable "openai_model" {
  type    = string
  default = "gpt-4.1-mini"
}

variable "allowed_origins" {
  description = "HTTP API CORS origins. Keep * for the generated CloudFront domain."
  type        = list(string)
  default     = ["*"]
}
