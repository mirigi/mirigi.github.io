


all: node_modules
	./node_modules/.bin/gulp build

serve: 
	docker run -v $(shell pwd):/usr/src/app -p 4000:4000 mirigi-jekyll-site

node_modules:
	npm install

