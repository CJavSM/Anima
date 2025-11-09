## Diagramas de Git automáticos

Este repositorio incluye una utilidad para generar automáticamente un diagrama SVG del historial Git (commits y ramas) y un workflow de GitHub Actions que puede generarlo en cada push.

Qué hace
- Recorre el historial Git del repositorio con GitPython.
- Genera un grafo DOT y lo renderiza como `git-diagram.svg` usando Graphviz.
- El workflow de GitHub Actions puede generar el SVG y guardarlo en `docs/git-diagram.svg`.

Dependencias (local)
- Python 3.8+
- pip packages: `GitPython`
- Graphviz (ejecutable `dot`) en PATH. En Windows instala Graphviz desde https://graphviz.org/download/ o con Chocolatey.

Generar localmente (Windows PowerShell)
```powershell
# crear entorno e instalar dependencias
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install GitPython

# instalar Graphviz (si no está instalado) manualmente -> https://graphviz.org/download/
# luego ejecutar el script
python scripts/generate_git_diagram.py --out git-diagram.svg --max-commits 200
```

Generación automática (CI)
- El workflow `.github/workflows/git-diagram.yml` ejecuta el script en cada push y guarda el SVG en `docs/`.
- El workflow usa `GITHUB_TOKEN` para commitear el archivo actualizado si cambia.

Soporte para `gitdiagram` (Ahmed Khaleel)
- El workflow intentará primero usar `gitdiagram` (desde GitHub) vía `npx github:ahmedkhaleel2004/gitdiagram` y, si no está disponible o su CLI difiere, caerá al script Python incluido.
- Si prefieres forzar `gitdiagram` en lugar del fallback, edita `.github/workflows/git-diagram.yml` para usar únicamente el paso de `npx`.

Evitar bucles en CI
- Para evitar que el commit del SVG vuelva a disparar el workflow, el workflow omite commits con el mensaje `chore(ci): update git-diagram.svg`.

Privacidad
- El diagrama incluye mensajes y hashes de commits; revisa antes de publicar información sensible.

Personalización
- Ajusta `--max-commits` o añade filtros por autor/fecha en `scripts/generate_git_diagram.py`.

Licencia
- Reutiliza conforme a la licencia del repositorio.
