variable "name_prefix" {
  type = string
}

variable "role_arn" {
  type        = string
  description = "Existing Lambda execution role ARN (use Academy LabRole in restricted labs)."
}

variable "functions" {
  type = map(object({
    zip_path    = string
    handler     = optional(string, "lambda_function.lambda_handler")
    runtime     = optional(string, "python3.12")
    timeout     = optional(number, 30)
    memory_size = optional(number, 256)
    environment = optional(map(string), {})
  }))
}

variable "tags" {
  type    = map(string)
  default = {}
}
