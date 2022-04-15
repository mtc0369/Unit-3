
//anonymous function to wrap script
(function(){    
    
    //pseudo-global variables - accessible to all functions that are called within this anonymous function
    var attrArray = ["yr1970-yr1980", "yr1980-yr1990", "yr1990-yr2000", "yr2000-yr2010", "yr2010-yr2020"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.55,
        chartHeight = 460,
        leftPadding = 35,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    
    
    var yScale = d3.scaleLinear()
        .range([450, 43])   
        .domain([-1000, 100]);
           
    //create a scale to size bars proportionally to frame and for axis
    
        

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){
        //create map frame
        var width = window.innerWidth * 0.4,//had to make map width smaller to accompdate large bar chart
            height = 460;

        //create svg container for the map
        var map = d3
            .select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height)
            //.style("background-color", "rgba(0,109,44,0.5)");

        //projection generator - create Albers equal area projection centered on WI
        var projection = d3
            .geoAlbers()
            .center([0, 44.8])//long, lat
            .rotate([89.8, 0, 0])//long, lat, angle
            .parallels([42, 46])//2 lats specific to a conic projection
            .scale(5500)//pixel scale/zoom level - converts projection to pixel value
            //moves map to be half width and height of map frame - not necessary if adjustments made in .center; however, will auto center the map when changing parameters
            .translate([width / 2, height / 2]);//or adding components like the bar chart to the DOM

        //define path with generator - converts projection into usable object
        var path = d3
            .geoPath()
            .projection(projection);//only takes 1 parameter

        //use Promise.all to parallelize asynchronous data loading       
        var promises = [d3.csv("data/NRHP_List_Wisconsin_Final.csv"),
                    d3.json("data/WI_SurroundStates.topojson"),
                    d3.json("data/Wisconsin_Counties.topojson")];
                    Promise.all(promises).then(callback);                 

        //data parameter - retrieves data as an array
        function callback(data){ 
                    
            csvData = data[0], states = data[1], wiCounties = data[2];   
            
            setGraticule(map, path);
            
            //2 arguments for features in topojson, 2nd part of 2nd argument refers to the objects in the topojson - syntax must be exact same and will fail if file name is changed
            var statesMid = topojson.feature(states, states.objects.WI_SurroundStates),
                countyNRHP = topojson.feature(wiCounties, wiCounties.objects.Wisconsin_Counties).features;//have to add .features to end to create an array
            
            //adding surrounding states to the map
            var stateFeatures = map
                .append("path")
                .datum(statesMid)//everything will be drawn as a single feature
                .attr("class", "stateFeatures")
                .attr("d", path);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            //join csv data to GeoJSON enumeration units
            countyNRHP = joinData(countyNRHP, csvData);
            
            //add enumeration units to the map
            setEnumerationUnits(countyNRHP, map, path, colorScale);

            //adding bar chart
            setChart(csvData, colorScale);

            //calling create dropdown
            createDropdown(csvData);
            
        };
    };//end of set map function
    
        //function to create a DROPDOWN MENU for attribute selection
        function createDropdown(csvData){
            //add select element
            var dropdown = d3
                .select("body")
                .append("select")
                .attr("class", "dropdown")
                .on("change", function(){
                    changeAttribute(this.value, csvData)                    
                });

            //add initial option
            var titleOption = dropdown
                .append("option")
                .attr("class", "titleOption")
                .attr("disabled", "true")
                .text("Select Attribute");

            //add attribute name options
            var attrOptions = dropdown
                .selectAll("attrOptions")
                .data(attrArray)
                .enter()
                .append("option")
                .attr("value", function(d){ return d })
                .text(function(d){ return d });
        };

        //dropdown change event handler
        function changeAttribute(attribute, csvData) {
            //change the expressed attribute
            expressed = attribute;

            //recreate the color scale
            var colorScale = makeColorScale(csvData);

            //recolor enumeration units
            var counties = d3.selectAll(".counties")
                .style("fill", function (d) {
                    var value = d.properties[expressed];
                    if (value) {
                        return colorScale(d.properties[expressed]);
                    } 
                    else {
                        return "#969696";
                    }
            });

            //Sort, resize, and recolor bars
            var circles = d3.selectAll(".circles")
            //Sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .attr("x", function(d, i){
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            //resize bars
            .attr("height", function(d, i){
                return 450 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //recolor bars
            .style("fill", function(d){            
                var value = d[expressed];            
                if(value) {                
                    return colorScale(value);            
                } else {                
                    return "#969696";            
                }    
            });

        };

        //function to create coordinated bar chart - axis scale
        function setChart(csvData, colorScale){

            var chart = d3.select("body") //get the <body> HTML element from the DOM
                //method chaining
                .append("svg") //put a new svg in the body
                .attr("width", chartWidth) //assign the width set to w
                .attr("height", chartHeight) //assign the height set to h
                //can also go into css and set background styles using the class = .container
                .attr("class", "chart") //always assign a class (as the block name) for styling and future selection
                //need to add a background color to see what is happening in the svg block
                .style("background-color", "rgba(0,109,44,0.5)"); //only put a semicolon at the end of the block!

                //console.log(chart);            

            //Example 1.8 appending innerRect block to the container variable
            var innerRect = chart.append("rect")
                .datum(400) //a single value is a DATUM - method applied to the variable
                .attr("width", function(d){ //rectangle width using the datum with a function
                    return d * 1.95; // using datum, always called by 'd' 400 * 2 = 800
                })
                .attr("height", function(d){ //rectangle height using the datum with a function
                    return d; //using datum 400
                })
                .attr("class", "innerRect") //class name
                .attr("x", 40) //position from left on the x (horizontal) axis
                .attr("y", 40) //position from top on the y (vertical) axis
                .style("fill", "#f7fcf0"); //fill color - can't use bakground-color format here because its used in overall svg element

            //create a linear scale to convert data without having to find precise coefficient manually
            //Linear is one of several scale options offered by D3
            //Scale must be defined above functions that use it or it will not be applied
            var x = d3.scaleLinear()//crates a generator - custom functiondeciding the range of each output value
                //left(west) extent, right(east) extent
                .range([50, 800])//output minimum and maximum - pixel values on the page/map
                .domain([0, 72]);//input minimum and maximum - info we are putting into the function - INDEX OF THE ARRAY OBJECTS 0,1,2,3

        //Defining y scale more complicated than x; have to consider the minimum and maximum values of the data being used

            //find the minimum value of the array without having to physically search the dataset
            var minPop = d3.min(csvData, function(d){
                return d[expressed];
            });

            //find the maximum value of the array without going through the dataset
            var maxPop = d3.max(csvData, function(d){
                return d[expressed];
            });
            
            var y = d3.scaleLinear()
                //lower (south) extent of rectangle(left), upper (north) extent(right)
                .range([450, 50])
                .domain([-1000, 150]);

            //Generating color scales
            /*var color = d3.scaleLinear()
                //two color values entered - D3 knows how to interpolate color values - based on rgb codes
                //arranged in smaller to larger format - D3 will interpolate the colr range based on the input here
                .range([
                    "#e7d4e8",
                    "#762a83"
                ])
                .domain([
                    minPop,
                    maxPop
                ]);*/

            //appends a circle for every item in dataValues array
            var circles = chart.selectAll(".circles")//placeholder or empty selection because circles have not been created yet - USE CLASS NAME IN EMPTY SELECTION
                .data(csvData)//calling the multiple data values in the array variable; set to dataValues or cityPop depending on data source
                .enter()//assigns data to empty selection and makes it available for use as new elements are being created
                .append("circle")//creates a new circle for every item in the array; iterates on its own without a function
                .attr("class","circles")//set class for the circle, MUST MATCH WHAT IS IN SELECTALL FUNCTION
                .attr("class", function(d){
                    return "circle " + d.NAME;
                })
                .attr("id", function(d){
                    return d[expressed];
                })
                //sets radius
                .attr("r",function(d){
                    //calculate the circle radius based on populations in array
                    var area = d[expressed] * 2;//have to set very small because dealing with pixel size and the circle size could potentially engulf the page
                    if (area !== 0){
                        return Math.sqrt(area/Math.PI);//converts the area to the radius
                    }
                    else{
                        return 1;//to display something for 0 values
                    }
                })
                //sets circle x coordinate, i refers to the index of the data here
                //always have to call the data first before the index
                .attr("cx", function(d, i){
                    //calls on Linear scale from above and the index
                    return x(i);//spaces the circle width (horizontal axis) using x values
                })
                //sets circle y coordinate
                .attr("cy", function(d){
                    //subtracting from the max value at the bottom of the rectangle, multiplied by smaller number to distance is not off page/map
                    return y(d[expressed]) - 10;//spaces the circle height (verticle axis) using min and max value range from y variable
                })
                //applies color values stored within color variable above
                .style("fill", function(d){
                    return colorScale(d[expressed]);
                })
                .style("fill", function(d){
                    var value = d[expressed];
                    if (value !== 0){
                        return colorScale(d[expressed]);
                    }
                    else{
                        return "#969696";
                    }
                })
                .style("stroke", "#000");//creates a black color stroke around circles
            console.log(circles)
            
            /*function calcStats(data) {
                var allValues = []; //variable for empty array to hold data values
                //for loop to iterate through the array in Deadliest Tornadoes geojson
                for(var state of data.features) {
                    //another loop to iterate through each year in the array and retirve pop
                    for(var year = 2010; year <= 2020; year +=1) {
                        var value = state.properties[String(year)+" Deaths"];
                        //console.log(value)
                        //push the population values to the empty array above
                        allValues.push(value);            
                    }
                }
                //get min, max, mean stats for the array
                dataStats.min = Math.min(...allValues);
                dataStats.max = Math.max(...allValues);
                //Calculate meanValue
                var sum = allValues.reduce(function(a,b){
                    return a+b;
                });
                dataStats.mean = sum / allValues.length;    
            };
            
            //function to calculate the radius of the proportional symbols
            function calcPropRadius(attValue) {
                //variable to hold number used in formula below to size Prop sybols evenly
                var minRadius = 3
                //Flannery Appearance Compensation formula held in new variable
                //replaced minRadius in equation with 1, zeros return NaN or Infinity
                var radius = 1.0083 * Math.pow(attValue/1, 0.5715) * minRadius
                
                console.log(radius)
                //return the radius of each symbol
                return radius;
            };*/


            
            var yAxis = d3.axisLeft(y);//creating a y axis generator

            var axis = chart.append("g")//creating an axis g element and adding it to the axis
                .attr("class", "axis")
                .attr("transform", "translate(40, -10)")//Example 3.9 transforming attr to the g-element; translate moves axis to the right of the 0,0 corrdinate(in view) by entering 50
                //basically translates the x,y coordinates of the axis
                .call(yAxis);
            
            //adding a title [class] to the chart
            var title = chart.append("text")
                .attr("class", "chartTitle")
                .attr("text-anchor", "middle")//centers the text - without this centering would have to be done by offsetting x coordinate value
                .attr("x", chartWidth / 2)//assigns horizontal position
                .attr("y", 25)//assign verticle position
                .text("Percent Change in NRHP Listings for " + expressed + " in each County")//text content
                //.style("fill", "#810f7c");

            //creating circle labels
            var labels = chart.selectAll(".labels")
                .data(csvData.length)
                .enter()
                .append("text")
                .attr("class", "labels")
                .attr("text-anchor", "left")                
                .attr("y", function(d){
                    //vertical position centered on each circle
                    return y(d[expressed]) - 2;//adjusted to center the label block on the circles
                });
                
            
            //creating the first line in the label
            var nameLine = labels.append("tspan")
                .attr("class", "nameLine")
                .attr("x", function(d,i){
                    return x(i) + Math.sqrt(d[expressed] * 0.01 / Math.PI) + 5;
                })
                //returns the county name
                .text(function(d){
                    return d.NAME;
                });

            
            var format = d3.format(",");//generates commas to where applied

            //creating the second line in the label
            var popLine = labels.append("tspan")
                .attr("class", "popLine")
                .attr("x", function(d,i){
                    return x(i) + Math.sqrt(d[expressed] * 0.01 / Math.PI) + 5;
                })
                .attr("dy", "15")
                .text(function(d){
                    return "Percent " + format(d[expressed]);
                });

                
        };

        //function for data join    
        function joinData(countyNRHP, csvData){    
            //loop through csv to assign each set of csv attribute values to geojson region
            for (var i=0; i<csvData.length; i++){
                var csvCounty = csvData[i]; //the current county
                var csvKey = csvCounty.NAME; //the CSV primary key

                    //loop through geojson regions to find correct region
                for (var a=0; a<countyNRHP.length; a++){

                    var geojsonProps = countyNRHP[a].properties; //the current region geojson properties
                    var geojsonKey = geojsonProps.NAME; //the geojson primary key

                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey){

                        //assign all attributes and values
                        attrArray.forEach(function(attr){
                            var val = parseFloat(csvCounty[attr]); //get csv attribute value
                            geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    };
                };
                
            };
            console.log(countyNRHP)
            return countyNRHP;
        };
        
        //function to create color scale generator - MANUAL BREAKS
        function makeColorScale(data){
            
            //create color scale generator
            var colorScale = d3
                .scaleThreshold()
                .domain([-1000, -500, -250, -100, -50, -1, 0, 1, 50, 100])
                .range(["#3f007d", "#54278f", "#6a51a3", "#807dba", "#9e9ac8", "#bcbddc", "#969696", "#edf8e9", "#74c476", "#31a354", "#006d2c"]);
            
            return colorScale;
            
            /*var colorClasses = [
                "#ffffcc",
                "#c2e699",
                "#78c679",
                "#31a354",
                "#006837"
            ];
        
            //create color scale generator
            var colorScale = d3
                .scaleThreshold()
                .range(colorClasses);
        
            //build array of all values of the expressed attribute
            var domainArray = [];
            for (var i=0; i<data.length; i++){
                var val = parseFloat(data[i][expressed]);
                domainArray.push(val);
            };
        
            //cluster data using ckmeans clustering algorithm to create natural breaks
            var clusters = ss.ckmeans(domainArray, 5);
            //reset domain array to cluster minimums
            domainArray = clusters.map(function(d){
                return d3.min(d);
            });
            //remove first value from domain array to create class breakpoints
            domainArray.shift();
        
            //assign array of last 4 cluster minimums as domain
            colorScale.domain(domainArray);
        
            return colorScale;*/
        };
        //function for graticule
        function setGraticule(map, path){
            //create graticule generator with lines at 5 deg lat/long increments
            var graticule = d3
                .geoGraticule()
                .step([5,5]);

            //create graticule background and class for styling
            var gratBackground = map
                .append("path")
                .datum(graticule.outline())
                .attr("class", "gratBackground")
                .attr("d", path);           
            
            //method to create graticule lines and class - same syntax as other variables
            var gratLines = map
                .selectAll(".gratLines")
                .data(graticule.lines())
                .enter()
                .append("path")
                .attr("class", "gratLines")
                .attr("d", path);
            };
        //function to iterate and add counties
        function setEnumerationUnits(countyNRHP, map, path, colorScale){
            //adding WI counties to the map
            var countyFeatures = map
                .selectAll(".counties")
                .data(countyNRHP)
                .enter()
                .append("path")
                .attr("class", function(d){
                    return "counties " + d.properties.NAME;
                })
                .attr("d", path)//finds coordinates of the path - "d" does not stand for datum
                .style("fill", function(d){
                    var value = d.properties[expressed];
                    if (value !== 0){
                        return colorScale(d.properties[expressed]);
                    }
                    else{
                        return "#969696";//will return no value or 0 value as grey
                    }                        
                });               
            };        
    
})();

    





