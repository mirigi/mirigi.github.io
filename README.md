# Mirigi Website - Content Management

This document explains how to manage the content of the Mirigi website, including adding feature descriptions, customer descriptions, and images.

**For details on how to run and build this content locally, go to [README.dev.md](README.dev.md)**

## Adding a Feature Description

1. **Navigate to the features directory:**
   - Open the `collections/_features/en` directory. This directory contains the feature descriptions in English. 

2. **Create a new markdown file:**
   - Create a new file with a descriptive name, for example, `new-feature.md`.

3. **Add frontmatter and content:**
   - Open the file and add the following frontmatter at the top of the file:

     ```yaml
     ---
     title: "New Feature"
     image: "/img/feature/new-feature.jpg" 
     layout: feature
     description: "A short description of the new feature."
     ---
     ```

   - Replace `"New Feature"`, `/img_mirigi/new-feature.jpg`, and `"A short description of the new feature."` with the appropriate title, image path, and description for your new feature.

   - Below the frontmatter, add the detailed description of the new feature using Markdown.

4. **(Optional) Translate the feature description:**
   - If you want to provide the feature description in other languages, you can manually translate the content and create corresponding markdown files in the respective language directories (e.g., `collections/_features/es` for Spanish).
   - Or you can use the AI translation script (instructions on how to use the script are beyond the scope of this document).

## Adding a Customer Description

Adding customers is the same than adding feature, but the files are served at `collections/_customers/en`. Follow the steps above.

## Adding Images

1. **Image location:**
   - Store images in the `img` directory at the root of the website. You can create subdirectories within these directories to organize your images if needed.

2. **Referencing images in markdown files:**
   - Use the relative path to the image from the markdown file in the `image` field of the frontmatter. For example:

     ```yaml
     image: "/img/my-image.jpg" 
     ```

3. **Image credits:**
   - If you need to add image credits, you can use the `image_credits` field in the frontmatter. For example:

     ```yaml
     image_credits: '@<a href="https://www.flickr.com/photos/jikatu/">jikatu</a>'
     ```


## Editing Content
You can edit the content directly on the github website by browsing the files and clicking the edit button.
Once you finish the editing you can commit the change and it will update the website automatically

You can also download the repository and edit it locally, once you finish the changes you can commit and push the files to the repository.


