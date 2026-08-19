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

variable "create_lambda_role" {
  description = "Create a Lambda execution role. Set false in AWS Academy, which already provides LabRole and blocks IAM role creation."
  type        = bool
  default     = true
}

variable "enable_cloudfront" {
  description = "Put CloudFront in front of S3 and /api/*. Required for another account to behave like Amplify. Set false in AWS Academy."
  type        = bool
  default     = true
}

variable "academy_role_name" {
  description = "Existing AWS Academy execution role used when create_lambda_role is false and lambda_role_arn is null."
  type        = string
  default     = "LabRole"
}

variable "lambda_role_arn" {
  description = "Optional existing execution role ARN. Used when create_lambda_role is false."
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
