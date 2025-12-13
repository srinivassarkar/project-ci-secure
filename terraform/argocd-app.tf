resource "kubernetes_manifest" "color_palette_app" {
  manifest = yamldecode(file("${path.module}/../argocd/color-palette.yaml"))

  depends_on = [
    helm_release.argocd
  ]
}
