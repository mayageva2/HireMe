variable "aws_region" {
  description = "AWS region used by the Academy lab."
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Optional AWS CLI profile. Leave empty to use environment credentials such as an Academy lab session."
  type        = string
  default     = ""
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

variable "enable_amplify" {
  description = "Host the React app on Amplify with /api rewrites, matching the current lab."
  type        = bool
  default     = true
}

variable "enable_cloudfront" {
  description = "Optional S3 + CloudFront hosting. Leave false; Amplify is the lab setup."
  type        = bool
  default     = false
}

variable "enable_agent" {
  description = "Create the ECR repository and ECS Fargate interview agent."
  type        = bool
  default     = false
}

variable "agent_desired_count" {
  description = "Number of Fargate agent tasks. Keep 0 for bootstrap, then set 1 after pushing the image and secret."
  type        = number
  default     = 0
}

variable "agent_image_tag" {
  type    = string
  default = "latest"
}

variable "hr_simli_face_id" {
  description = "Existing Simli face ID used for HR interviews."
  type        = string
  default     = ""
}

variable "technical_simli_face_id" {
  description = "Simli face ID used for technical interviews."
  type        = string
  default     = "dd10cb5a-d31d-4f12-b69f-6db3383c006e"
}

variable "agent_create_network" {
  description = "Create a small public VPC for the Fargate worker."
  type        = bool
  default     = true
}

variable "agent_existing_vpc_id" {
  description = "Existing VPC ID when agent_create_network is false."
  type        = string
  default     = null
}

variable "agent_existing_subnet_ids" {
  description = "At least two outbound-capable subnet IDs when agent_create_network is false."
  type        = list(string)
  default     = []
}

variable "connect_github" {
  description = "Let Terraform attach the GitHub repo to Amplify. Needs github_access_token. Leave false to connect the repo in the Amplify console instead."
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "GitHub repo URL, used only when connect_github is true."
  type        = string
  default     = "https://github.com/MayaandMayOrganization/HireMe"
}

variable "github_access_token" {
  description = "GitHub personal access token with repo scope. Leave empty to create the Amplify app without connecting Git."
  type        = string
  sensitive   = true
  default     = ""
}

variable "amplify_branch_name" {
  type    = string
  default = "may-dev"
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
