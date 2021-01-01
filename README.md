# gameinfo.js
Copyright 2010-2020 Adam Nielsen <<malvineous@shikadi.net>>  

This is a Javascript library that ties together the other Camoto Javascript
libraries to provide a single unified interface to supported games.  With this
library, rather than having to know which archive files to open and what each
file is for, all that is abstracted away and instead a list of items is
provided.  Each item can be "opened", which will return an instance of whatever
the file happens to be - a `Map` instance from gamemaps.js if it's a game
level, or a `Music` instance from gamemusic.js if it's a song, and so on.

## Installation as an end-user

Although not the intended use (due to limited functionality), you can install
the library as an end-user and use the command-line `gameinfo` utility to work
with games directly.  To install it globally on your system:

    npm install -g @camoto/gameinfo

## Game support

The library currently supports these games:

 * Cosmo's Cosmic Adventure (episode 1)

### Command line interface

The `gameinfo` utility can be used to access some of the library's
functionality.  Commands are specified one after the other as parameters.  Use
the `--help` option to get a list of all the available commands.  Some quick
examples:

    # List available items in a game, autodetected from the files found in the
    # given folder.
    gameinfo open /dos/games/cosmo list
    
    # Rename an element and save changes.
    gameinfo open /dos/games/cosmo rename -n newfile.mni music.19 save

To get a list of supported games, run:

    gamecode --formats

## Installation as a dependency

If you wish to make use of the library in your own project (the intended
purpose!), install it in the usual way:

    npm install @camoto/gameinfo

See `cli/index.js` for example use.  The quick start is:

    import GameInfo from '@camoto/gameinfo';
    import Filesystem from '@camoto/gameinfo/interface/filesystem.js';
    
    let fs = new Filesystem('/dos/games/cosmo');
    const handler = GameInfo.getHandler('game-cosmo');
    const game = new handler(fs);
    const warnings = game.open();
    console.log('Warnings:', warnings);

## Installation as a contributor

If you would like to help add more file formats to the library, great!
Clone the repo, and to get started:

    npm install --dev

Run the tests to make sure everything worked:

    npm run -s test

You're ready to go!  To add a new game:

 1. First make sure the file formats you need have been implemented in the other
    support libraries, e.g. all the archive formats are supported by
    gamearchive.js, the levels by gamemaps.js, the images by gamegraphics.js,
    and so on.
    
 2. Create a new file in the `formats/` folder for your game.  Copying an
    existing file that covers a similar game will help considerably.
    
 3. Edit the main `index.js` and add an `import` statement for your new file,
    as well as adding it to the array of games.
    
During development you can test your code like this:

    # Read a sample archive and list the files, with debug messages on
    $ DEBUG='game*' ./bin/gameinfo open /path/to/game list
