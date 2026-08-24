variable "name_prefix" {
  type = string
}

variable "lambda_invoke_arns" {
  type = map(string)
}

variable "lambda_function_names" {
  type = map(string)
}

variable "cognito_issuer" {
  type = string
}

variable "cognito_client_id" {
  type = string
}

variable "allowed_origins" {
  type    = list(string)
  default = ["*"]
}

variable "tags" {
  type    = map(string)
  default = {}
}
