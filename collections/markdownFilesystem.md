# Especificación del Sistema de Archivos Markdown

Este documento explica el formato "Sistema de Archivos Markdown", que es un método sencillo para representar una jerarquía de sistema de archivos y contenido de archivos usando Markdown.

## Estructura Básica

El formato utiliza encabezados de Markdown para indicar directorios y bloques de código para representar el contenido de los archivos.

- **Directorios:** Indicados por encabezados de Markdown (`#`, `##`, `###`, etc.). El nivel del encabezado muestra la profundidad del directorio. Por ejemplo, `##` representa un subdirectorio dentro de un directorio de nivel superior.
- **Archivos:** Indicados por un título que sigue la jerarquía del directorio y seguido por bloques de código, usando triple acento grave (\```), que contienen el contenido del archivo. El identificador de lenguaje después de los acentos graves de apertura es opcional y puede especificar el tipo de archivo (por ejemplo, `python`, `json`).

## Ejemplo
### El sistema de archivos Markdown

   # ./
   ## src/
   ### module.py
   \```python
   def hello_world():
     print("Hello, world!")
   \```

   ## data.json
   \```json
   {
     "name": "My Project"
   }
   \```

   ## readme
   \```md
   # Mi archivo readme
   ~~~txt
   Bloque de código anidado
   ~~~
   \```

### La estructura de archivos representada:

   \```
   project/
    src/
       module.py
    data.json
    readme
   \```

## Reglas

- El directorio de nivel superior está indicado por un solo `# ./`.
- Cada nivel de encabezado subsiguiente representa un subdirectorio.
- El contenido del archivo debe estar encerrado dentro de bloques de código.
- Los nombres de los archivos deben estar en el encabezado de la sección que contiene el bloque de código.
- Los directorios vacíos no necesitan un bloque de código vacío.
- IMPORTANTE: Al escribir un archivo markdown dentro del sistema de archivos markdown, si contiene un bloque de código, debe escaparse como "\`\`\`" o usando triple tilde ~ (preferido).

