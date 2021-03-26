# Dangerous Dave [game-ddave]

These tips are for modding Dangerous Dave 1.

## Graphics

### Player/monster sprites

If the player or monster sprites are exported as a tileset (multiple frames in
a single image) then the dimensions of each frame must remain the same as the
original sprite.  If instead each frame of the sprite is replaced individually,
the dimensions can be changed (they will automatically match the dimensions of
the image being imported).  This however has not been tested so it is currently
unknown how the game will handle differently sized sprites.  Only the first 53
tiles (the map tileset) are fixed at 16x16 and cannot be resized.

The player sprite has a mask layer for transparency, however to make modding
easier the mask is merged in with the original frame, and an unused colour in
the palette (index 230) is used for transparent pixels.  When reading in a
modified image, any pixel using a palette entry that is fully transparent will
be written to the mask image as a transparent pixel - it does not have to be
limited to the original palette index 230.  If you are changing the game's
palette, try to leave entry 230 free.  This can be relocated to a different
palette entry but it is not currently configurable so requires changing the
gameinfo.js source code.  Apart from the player sprite, none of the other
images have masks or transparent pixels so this does not apply to them.
