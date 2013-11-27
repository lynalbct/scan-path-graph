Scan path plotter
===============

This is a web application to plot scan path based on eye tracking data of images. It can read a (image, data) file pair and draw scan path as output. All graphs are drawn in svg format and can be exported into png image for download.

Features
---------------
* A simple user account system used to maintain file relations and for revisiting.
** File uploading. You can upload one image with multiple data files for that image each time.
** Listing of files that have been uploaded. Click one image item and choose a data item, the application will start plotting automatically.
* A user control bar.
** Playback control. You can replay entire plotting sequence or step data points.
** Timeframe bar. Data points are mapped to this bar for a better view on the timing of each point in the entire timeframe, as well as the spread of each data point.
** Settings. You can apply filters to the current dataset or adjust thresholds for use with fixation calculation.
*** Turn on fixation calculation will give you a new set of data points calculated from the data read from input file.
*** You can also export the graph to png format for download.
* Information display for each data point
** Data point size represents the relative fixation duration of that point. The bigger the longer
** Each data point on the graph is responsive to mouse hover event. When hovering over one, the statistics of current data point will be displayed at bottom-left corner of the window.
** A rollover will popup if there is an overlapping of multiple data points.
** Animation on connected edges represents the direction of where the eye scans from, and where it will scan next.
