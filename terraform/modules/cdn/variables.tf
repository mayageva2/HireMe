variable "name_prefix" {
  type = string
}

variable "enable_cloudfront" {
  type = bool
}

variable "frontend_bucket_id" {
  type = string
}

variable "frontend_bucket_arn" {
  type = string
}

variable "frontend_bucket_regional_domain_name" {
  type = string
}

variable "api_domain_name" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
