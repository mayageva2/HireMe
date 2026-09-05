variable "name_prefix" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "desired_count" {
  type    = number
  default = 0
}

variable "cpu" {
  type    = number
  default = 1024
}

variable "memory" {
  type    = number
  default = 2048
}

variable "main_table_arn" {
  type = string
}

variable "main_table_name" {
  type = string
}

variable "hr_questions_table_arn" {
  type = string
}

variable "hr_questions_table_name" {
  type = string
}

variable "openai_model" {
  type = string
}

variable "hr_simli_face_id" {
  type = string
}

variable "technical_simli_face_id" {
  type = string
}

variable "create_network" {
  type    = bool
  default = true
}

variable "existing_vpc_id" {
  type    = string
  default = null
}

variable "existing_subnet_ids" {
  type    = list(string)
  default = []
}

variable "tags" {
  type    = map(string)
  default = {}
}
