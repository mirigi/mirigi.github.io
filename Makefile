

all:
	npm install
	./node_modules/.bin/gulp build
	tar jcf mirigi_web.tar.bz2  index.html img_mirigi/   css/ js vendor
