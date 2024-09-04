
To build and run the Jekyll site using Docker, follow these steps:

1. Build the Docker image:
   ```bash
   docker build -t mirigi-jekyll-site .
   ```

2. Run the Docker container:
   ```bash
   docker run -v $(pwd):/usr/src/app -p 4000:4000 mirigi-jekyll-site
   ```

The site will be available at `http://localhost:4000`.
```
