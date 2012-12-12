
all: mini-mp3.swf

mini-mp3.swf: MiniMP3.as
	mtasc -version 8 -strict -v -main -header 200:20:24 -swf mini-mp3.swf MiniMP3.as
	cp -a mini-mp3.swf ../assets/

clean:
	rm -f mini-mp3.swf

.PHONY: all clean