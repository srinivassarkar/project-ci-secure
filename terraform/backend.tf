terraform {
  backend "s3" {
    bucket       = "tfstate-eks-secure-seenu-d9e9f7"
    key          = "prod/eks-cluster.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true   
  }
}