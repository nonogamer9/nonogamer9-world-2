# nonogamer9WORLD

This project is a revival of the classic chat client experience. Thanks for all the laughs and memes along the way.  
This is also inspired by previous community projects. Note that the `/owo` command has been removed and the voice has changed back to espeak.js, due to version 1.4.2 conditions.

All the source code for the server and client is publicly available here. If you want to run your own nonogamer9WORLD, by all means go ahead. Do whatever you'd like with this code. Just try to put me somewhere in the credits.

## Dependencies

- **Node.js and npm**
- **Ruby**
- **Sass**
- **Git**
- **Cordova (Optional)**

## Setup

In a terminal/command prompt, navigate to where you'd like nonogamer9WORLD to be placed and run the following:

```
git clone https://github.com/nonogamer9/nonogamer9-world-2
cd nonogamer9-world-2
```

### Client

```
cd src
npm install
grunt build_www
cd ..
```

### Server

```
cd server
npm install
node index.js
```

After this, nonogamer9WORLD will be accessible on port 3000. (http://localhost:3000/)

## Disclaimer

I'm not responsible if you screw up anything with your computer while setting this up. I have no idea how you would, but someone will find a way. I also will not provide support for installing dependencies. If you have everything installed properly, the above commands will work.

## License

MIT
