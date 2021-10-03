# gameinfo.js
Copyright 2010-2021 Adam Nielsen <<malvineous@shikadi.net>>  

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

 * Cosmo's Cosmic Adventure (episode 1) [incomplete]
 * Dangerous Dave [incomplete]

### Command line interface

The `gameinfo` utility can be used to access some of the library's
functionality.  Commands are specified one after the other as parameters.  Use
the `--help` option to get a list of all the available commands.  Some quick
examples:

    # List available items in a game, autodetected from the files found in the
    # given folder.
    gameinfo open /dos/games/cosmo list
    
    # Rename an element and save changes.  This changes the filename inside
    # COSMO1.VOL as well as patching COSMO1.EXE to use the new name.
    gameinfo open /dos/games/cosmo select music.19 rename newfile.mni save
    
    # Extract the title screen and save as a PNG image.
    gameinfo open /dos/games/cosmo select splash.title export -t img-png title.png
    
    # Load the PNG image again and use it to replace the title screen.
    gameinfo open /dos/games/cosmo select splash.title import title.png save

To get a list of supported games, run:

    gameinfo --formats

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

If you would like to help add more games to the library, great!
Clone the repo, and to get started:

    npm install

Run the tests to make sure everything worked:

    npm test

Most of the tests require original files from the games, which aren't part of
the git repo.  So to fully run the tests (and to add support for new games)
you'll need to copy the game files into the test folder:

 1. Find out the identifier for the game in question, e.g. `game-ddave` is the
    identifier for Dangerous Dave.
    
 2. Make a folder with this name inside the `test` folder, so in this case the
    command would be `mkdir test/game-ddave`
    
 3. Copy the game files into this new folder.  Only the files read and written
    by the format handler need to be included, but extra files (such as the
    game's documentation files) won't hurt.
    
 4. Run the tests again and confirm they are no longer showing as "skipped".
    You can run only the tests for this game with a command like
    `npm test -- -g game-ddave`.

Now you're ready to go!  To add a new game:

 1. First make sure the file formats you need have been implemented in the other
    support libraries, e.g. all the archive formats are supported by
    gamearchive.js, the levels by gamemaps.js, the images by gamegraphics.js,
    and so on.
    
 2. Create a new file in the `games/` folder for your game.  Copying an
    existing file that covers a similar game will help considerably.
    
 3. Edit `games/index.js` and add an `import` statement for your new file.

During development you can test your code like this:

    # Open a sample game and list the files, with debug messages on.
    $ DEBUG='game*' ./bin/gameinfo.js open /path/to/game list
    
    # Run the unit tests just for this game, using game-ddave as an example.
    $ DEBUG='gameinfo:*' npm test -- -g game-ddave
    
    # Run all the unit tests to ensure code passes the lint checks.
    $ DEBUG='gameinfo:*' npm test

Only very basic checks are performed with the standard tests.  You should create
an extra test file that actually performs some modifications, to ensure
everything is functioning correctly.

This is done by creating an extra `.js` file in the `test/` folder.  Copy one
of the existing files such as `test/game-ddave.js` to use as an example.  The
new file will be picked up automatically when the tests are run.

Once your code is at the point where you've gone as far as you can go with the
CLI and unit tests, you will probably want to test it with the web version of
Camoto, so you can view images, maps, etc.

To do this, clone the [studiojs repo](https://github.com/camoto-project/studiojs)
and follow the instructions to get it running locally.  Then replace the
gameinfojs dependency with your local version:

    cd studiojs
    npm remove @camoto/gameinfo
    npm install ../gameinfojs    # Use the path to your local copy

This will then make your local web UI use your development gameinfojs code, so
you can test out your changes before sending in a PR.

You can do a similar thing in gameinfo.js, removing one of the other
dependencies (say @camoto/gamemap) and replacing it with a local instance.
In this example, you would be able to change level reading/writing code in
gamemap.js and test it immediately through the web UI when opening a game level.
Depending on your caching/file watching settings, you may need to restart the
local web UI server before it picks up your changes.
