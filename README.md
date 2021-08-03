# Manga x Manga User Sources
Sources Set Up For Manga x Manga
**FOR NON-DEVELOPERS**
*If you simply want to have all the current official sources follow these instructions*
1. download this file: https://github.com/chubimauk/encryptedMXMFiles/blob/master/ebundle.txt
2. place it inside  /sources in the Files App Folder for MxM (this would be inside the Documents folder for MxM on MacOS)
3. search across multiple sources will only work with whatever sources you have available in your app
4. anilist is the only "source" included in the app without manually adding sources and is search only obviously

**Live Testing Sources on MacOS**
*if you have the app running on MacOS you can test your newsource without bundling it at all and without restarting the app usually*
To do so:
1. see below instructions and sample code for how to write your "newsourcename.js" (the file in /src, not the final file)
2. once you are satisfied with your code and want to test it in MxM, place your "newsourcename.js" file in the Documents/sources-dev/ folder on your Mac for MxM
3. make sure your Source Running Engine in MxM's settings is set to "Dev Engine"
4. toggle Source Running Engine after you've added a new file, this will trigger it to get picked up in the running app so you can test it.
5. if you take a look at source.js, you will see documentation for various node.js style server endpoints, besides testing your source in the application, you can also hit any of those endpoints on your localhost e.g.

`http://localhost:3000/info/manganelo` -- which will return the source info for manganelo which is used to populate advanced search filters and whether it uses cloudFlare or requires a login

`http://localhost:3000/popular/manganelo/1` -- which will return page 1 of the popular results for manganelo

a lot of the naming of the source.js base class is largely a mirror of Tachiyomi's naming conventions so that developers can more easily use it as a point of reference


**To generate a new js source file to use in the app (iOS or MacOS)**
1. move "newsourcename.js" file to /src which should have your source's source code, see the manganelo.js file for an example of what a working one looks like
2. in terminal from main directory call "npm run babelize", this will take files from /src and generate es5 files and place them in /src5
3. move files from /src5 into main directory
4. in terminal from main directory call "npm run bundle", this will create a bundle.js browserify file and place it in /browserTest folder
5. move files from /src back into main directory so they are the es6 original files again
6. you can change the html in main.html in /browserTest and open it in the browser to see if it functions but calling one of the exported methods and looking at the console
7. rename the bundle.js file to "newsourcename.js" and place this in /sources in the Files App Folder for MxM (this would be inside the Documents folder for MxM on MacOS)
8. rerun the app and your source should be selectable, if the app crashes you 100% have an error in your code, delete the file from the Files App for the app to run and take a look at your code

