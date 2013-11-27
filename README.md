Scan path plotter
===============

This is a web application to plot scan path based on eye tracking data of images. It can read a (image, data) file pair and draw scan path as output. All graphs are drawn in svg format and can be exported into png image for download.

##### Table of Contents  
[Features](##Features)  
[File format](##File format)  
[User account system](##User account system)

Features
---------------
* A simple user account system used to maintain file relations and for revisiting.
    * File uploading. You can upload one image with multiple data files for that image each time.
    * Listing of files that have been uploaded. Click one image item and choose a data item, the application will start plotting automatically.
* A user control bar.
    * Playback control. You can replay entire plotting sequence or step data points.
    * Timeframe bar. Data points are mapped to this bar for a better view on the timing of each point in the entire timeframe, as well as the spread of each data point.
    * Settings. You can apply filters to the current dataset or adjust thresholds for use with fixation calculation.
        * Turn on fixation calculation will give you a new set of data points calculated from the data read from input file.
        * You can also export the graph to png format for download.
* Information display for each data point
    * Data point size represents the relative fixation duration of that point. The bigger the longer
    * Each data point on the graph is responsive to mouse hover event. When hovering over one, the statistics of current data point will be displayed at bottom-left corner of the window.
    * A rollover will popup if there is an overlapping of multiple data points.
    * Animation on connected edges represents the direction of where the eye scans from, and where it will scan next.

File format
---------------
The application reads in a file format called .tbs, which is a simple text file in the following form:
* All spaces are tab delimited
    * 1st line: Trial name
    * 2nd line: sample rate; an integer represents samples/sec; e.g. 120
    * 3rd line: fixation register points (UL UR LL LR) x,y for each point
    * 4th line: image register points (UL UR LL LR) x,y for each point
    * 5th line and on: data (x y start duration)
* An example data file:

```
Example trial
120
140,92	364,97	138,388	364,392
124,85	503,89	122,363	501,368
220	40	0.0	141.666666667
182	100	216.666666667	141.666666667
178	101	366.666666667	166.666666667
179	107	541.666666667	475.0
307	53	1091.66666667	125.0
309	66	1225.0	50.0
305	68	1283.33333333	366.666666667
304	227	1733.33333333	25.0
```

User account system
---------------
* Since this application is in its initial stages, with the consideration of fitting it into a student project scope, the user account system is designed to be working, in terms of finding previously uploaded files for users, but at the same time leaving out the many detailed needed for a truly secure user system.
###Behavior:
  * At the login window, when user type in a (username, password) combination, the application will check if that combination exists in record, and read record if so. If not, **it will automatically create an entry in the record for that combination.**
  * A record is a simple plaintext file stored in JSON format. This file contains all file names related to a certain (username, password) combination.
  * For each (u,p) on record, the application creates a folder in both ```/data``` and ```/img```. Folder name is MD5 hashed(```MD5(username)``` concat ```MD5(password)```).
  * All images under this (u,p) combination will be stored under ```/img/userHash``` with MD5 hashed filename.
  * All data files under this (u,p) combination will be stored under ```/data/userHash``` with MD5 hashed filename(```MD5(imageName)``` concat ```MD5(dataFileName)```).
  * All these file names are written in the record. So a file retrieval will simply need a read from the record, and finding the file.
###Security:
  * Since the application uses a **fake** database system to record files under users, you should not use it in large scale applications.
  * Data files are stored in plaintext. Do not store sensitive data.
  * Since strings are MD5 hashed. Do not assume that (username,password) combinations are uncrackable. Treat (username,password) as only an identifier.
