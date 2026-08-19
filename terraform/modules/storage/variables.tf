variable "name_prefix" {
  type = string
}

variable "public_website" {
  description = "Open the frontend bucket for S3 website hosting. Set false when CloudFront OAC is used."
  type        = bool
  default     = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
