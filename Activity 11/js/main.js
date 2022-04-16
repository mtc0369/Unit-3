
//anonymous function to wrap script
(function(){    
    
    //pseudo-global variables - accessible to all functions that are called within this anonymous function
    var attrArray = ["years 1970-1980", "years 1980-1990", "years 1990-2000", "years 2000-2010", "years 2010-2020"]; //list of attributes    
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

        
    var x = d3.scaleLinear()
        .range([50, chartInnerWidth-20])//output minimum and maximum - pixel values on the page/map
        .domain([0, 72]);

    var y = d3.scaleLinear()        
        .range([450, 50])
        .domain([-1500, 200]);    
        
        /*.domain([
            d3.min(csvData, d => Math.min(d[expressed])),
            d3.max(csvData, d => Math.max(d[expressed]))
          ]);*/
    
    /*var yScale = d3.scaleLinear()
        .range([450, 43])   
        .domain([-1000, 100]);*/       

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
                .attr("value", function(d){ 
                    return d;
                })
                .text(function(d){ 
                    return d;
                });
        };

        //dropdown change event handler
        function changeAttribute(attribute, csvData) {
            //change the expressed attribute
            expressed = attribute;

            //recreate the color scale
            var colorScale = makeColorScale(csvData);

            //recolor enumeration units
            var counties = d3.selectAll(".counties")
                .transition()
                .delay(function(d,i){
                    return i * 20
                })
                .duration(1500)
                .style("fill", function (d) {
                    var value = d.properties[expressed];
                    if (value) {
                        return colorScale(d.properties[expressed]);
                    } 
                    else {
                        return "#969696";
                    }
            });        
        
            var minNum = d3.min(csvData, function(d){
                return d[expressed];
            });
            
            var maxNum = d3.max(csvData, function(d){                
                return d[expressed];                
            });

            var yNeg = d3.scaleLinear()
                .range([450, 50])//NEED TO ADJUST TO GET NEGATIVE CIRCLES POSITIONED PROPERLY
                .domain([
                    d3.min(csvData, d => Math.min(d[expressed])),
                    d3.max(csvData, d => Math.max(d[expressed]))
                ]);
        
            var circles = d3.selectAll(".circle")
                .on("mouseover", function(event, d){//event is referring to element being selected
                    highlight(d)
                })
                .on("mouseout", function(event, d){
                    dehighlight()
                })
                .on("mousemove", moveLabel)
                .attr("id", function(d){
                    return d[expressed];
                })
                .transition()
                .delay(function(d,i){
                    return i * 20
                })
                .duration(1000)
                //sets radius
                .attr("r",function(d){
                    //calculate the circle radius based on populations in array
                    var area = Math.abs(d[expressed] * 2);//have to set very small because dealing with pixel size and the circle size could potentially engulf the page
                    if (area > 0){
                        return Math.sqrt(area/Math.PI);//converts the area to the radius
                    }
                    else if (area == 0){
                        return 1;//to display something for 0 values
                    }
                    else{
                        return Math.abs(Math.sqrt(area/Math.PI));
                    }
                })
                
                .attr("cx", function(d, i){
                    //calls on Linear scale from above and the index
                    return x(i);//spaces the circle width (horizontal axis) using x values
                })
                //sets circle y coordinate
                .attr("cy", function(d){
                    var value = d[expressed];
                    if (value >= 0){
                        return y(parseFloat(d[expressed])) - 10;
                    }
                    else{
                        return Math.min(yNeg(d[expressed])), Math.max(yNeg(d[expressed]))
                    }
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
                .style("stroke", "#000"
                );       
            
            var chartTitle = d3.select(".chartTitle")
                .text("Percent Change in NRHP Listings for " + expressed + " in each County")
        };


        //function to create coordinated bar chart - axis scale
        function setChart(csvData, colorScale){

            var chart = d3.select("body") //get the <body> HTML element from the DOM
                //method chaining
                .append("svg") //put a new svg in the body
                .attr("width", chartWidth)  //assign the width set to w
                .attr("height", chartHeight) //assign the height set to h
                //can also go into css and set background styles using the class = .container
                .attr("class", "chart") //always assign a class (as the block name) for styling and future selection
                //need to add a background color to see what is happening in the svg block
                .style("background-color", "rgba(0,109,44,0.5)"); //only put a semicolon at the end of the block!

                //console.log(chart);            

            //appending innerRect block to the container variable
            var innerRect = chart.append("rect")
                .datum(400) //a single value is a DATUM - method applied to the variable
                .attr("width", chartInnerWidth - 40)
                .attr("height", function(d){ //rectangle height using the datum with a function
                    return d; //using datum 400
                })
                .attr("class", "innerRect") //class name
                .attr("x", 40) //position from left on the x (horizontal) axis
                .attr("y", 40) //position from top on the y (vertical) axis
                .style("fill", "#f7fcf0");             

            /*var x = d3.scaleLinear()
                .range([50, chartInnerWidth-20])
                .domain([0, 72]);
            
            var y = d3.scaleLinear()                
                .range([450, 50])
                .domain([-1500, 200]);*/             

            //appends a circle for every item in dataValues array
            var circles = chart.selectAll(".circle")                
                .data(csvData)
                .enter()
                .append("circle")
                .attr("class","circles")
                .attr("class", function(d){
                    return "circle " + d.NAME;
                })
                .on("mouseover", function(event, d){//event is referring to element being selected
                    highlight(d)
                })
                .on("mouseout", function(event, d){
                    dehighlight()
                })
                .on("mousemove", moveLabel)
                .attr("id", function(d){
                    return d[expressed];
                })
                .transition()
                .delay(function(d,i){
                    return i * 20
                })
                .duration(1000)
                
                //sets radius
                .attr("id", function(d){
                    return d[expressed];
                })
                //sets radius
                .attr("r",function(d){
                    //calculate the circle radius based on populations in array
                    var area = Math.abs(d[expressed] * 2);//have to set very small because dealing with pixel size and the circle size could potentially engulf the page
                    if (area > 0){
                        return Math.sqrt(area/Math.PI);//converts the area to the radius
                    }
                    else if (area == 0){
                        return 1;//to display something for 0 values
                    }
                    else{
                        return Math.abs(Math.sqrt(area/Math.PI));
                    }
                })
                
                .attr("cx", function(d, i){
                    //calls on Linear scale from above and the index
                    return x(i);//spaces the circle width (horizontal axis) using x values
                })
                //sets circle y coordinate
                .attr("cy", function(d){
                    var value = d[expressed];
                    if (value >= 0){
                        return y(parseFloat(d[expressed])) - 10;
                    }
                    else{
                        return Math.min(yNeg(d[expressed])), Math.max(yNeg(d[expressed]))
                    }
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
                .style("stroke", "#000"
                );
            //console.log(circles)    
               
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

            /*//creating circle labels
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
                });*/                            
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

        function highlight(props){
            //change stroke
            var selected = d3.selectAll("." + props.NAME)
                .style("stroke", "blue")
                .style("stroke-width", "3")
                setLabel(props);//calling set label
        }

        function dehighlight(){
            //change stroke
            var counties = d3.selectAll(".counties")
                .style("stroke", "rgb(250, 250, 250)")
                .style("stroke-width", "0.75")

            var circles = d3.selectAll(".circle")
                .style("stroke", "#000")
                .style("stroke-width", "0.2")

                d3.select(".infolabel")
                    .remove();
        };        
            
        //function to create dynamic label
        function setLabel(props){
            //label content
            var labelAttribute = "<h1>" + props[expressed] + "%" +
                "</h1><b>" + expressed + "</b>";

            //create info label div
            var infolabel = d3.select("body")
                .append("div")
                .attr("class", "infolabel")
                .attr("id", props.NAME + "_label")
                .html(labelAttribute);

            var countyName = infolabel.append("div")
                .attr("class", "labelname")
                .html("</h1><b>" + props.NAME +" County"+"</b>");            
        };

        //function to move info label with mouse
        function moveLabel(){
            //get width of label
            var labelWidth = d3.select(".infolabel")
                .node()
                .getBoundingClientRect()
                .width;

            //use coordinates of mousemove event to set label coordinates
            var x1 = event.clientX + 10,
                y1 = event.clientY - 75,
                x2 = event.clientX - labelWidth - 10,
                y2 = event.clientY + 25;

            //horizontal label coordinate, testing for overflow
            var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
            //vertical label coordinate, testing for overflow
            var y = event.clientY < 75 ? y2 : y1; 

            d3.select(".infolabel")
                .style("left", x + "px")
                .style("top", y + "px");
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
                })
                .on("mouseover", function(event, d){//event is referring to element being selected
                    highlight(d.properties)
                })
                .on("mouseout", function(event, d){
                    dehighlight()
                })
                .on("mousemove", moveLabel);               
            };        
    
})();

    





