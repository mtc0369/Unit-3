
//anonymous function to wrap script
(function(){    
    
    //begin script when window loads
    window.onload = setMap();

    //pseudo-global variables - accessible to all functions that are called within this anonymous function
    var attrArray = ["yr1970-yr1980", "yr1980-yr1990", "yr1990-yr2000", "yr2000-yr2010", "yr2010-yr2020"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

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
            var counties = d3.selectAll(".counties").style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(d.properties[expressed]);
                } 
                else {
                    return "#bababa";
                }
            });
        };

        //function to create coordinated bar chart - axis scale
        function setChart(csvData, colorScale){
            //chart frame dimensions
            var chartWidth = window.innerWidth * 0.55,
                chartHeight = 460,
                leftPadding = 25,
                rightPadding = 2,
                topBottomPadding = 5,
                chartInnerWidth = chartWidth - leftPadding - rightPadding,
                chartInnerHeight = chartHeight - topBottomPadding * 2,
                translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

            //create a second svg element to hold the bar chart
            var chart = d3.select("body")
                .append("svg")
                .attr("width", chartWidth)
                .attr("height", chartHeight)
                .attr("class", "chart");

            //create a rectangle for chart background fill
            var chartBackground = chart.append("rect")
                .attr("class", "chartBackground")
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight)
                .attr("transform", translate);

            //create a scale to size bars proportionally to frame and for axis
            var yScale = d3.scaleLinear()
                .range([450, 43])
                .domain([0, 450]);

            var yAxisScale = d3.scaleLinear()
                .domain([-400, 150])
                .range([chartHeight - yScale(-450), 0 ])

            //set bars for each province
            var bars = chart.selectAll(".bar")
                .data(csvData)
                .enter()
                .append("rect")
                .sort(function(a, b){
                    return b[expressed]-a[expressed]
                })
                .attr("class", function(d){
                    return "bar " + d.NAME;
                })
                .attr("width", chartInnerWidth / csvData.length - 1)
                .attr("x", function(d, i){
                    return i * (chartInnerWidth / csvData.length) + leftPadding;
                })
               /* .attr("y", function(d, i) { return chartHeight - Math.max(0, parseFloat(d[expressed]));})
                .attr("height", function(d) { return Math.abs(yScale(parseFloat(d[expressed]))); })*/
                .attr("height", function(d, i){
                    return 450 - yScale(Math.abs(parseFloat(d[expressed])));
                })
                .attr("y", function(d, i){
                    if (d[expressed] > 0){
                        return yScale(Math.abs(parseFloat(d[expressed]))) + topBottomPadding;
                    }
                    else {
                        return 
                    }
                })
                .style("fill", function(d){
                    return colorScale(d[expressed]);
                });
            //adding numbers to the bar chart
            var numbers = chart.selectAll(".numbers")
                .data(csvData)
                .enter()
                .append("text")
                .sort(function(a, b){
                    return b[expressed]-a[expressed]//this sort expresion must match the sort expression for 'bars'
                })
                .attr("class", function(d){
                    return "numbers " + d.NAME;//accesses numbers from this property
                })
                .attr("text-anchor", "middle")//centers numbers in middle of bar
                .attr("x", function(d, i){
                    var fraction = chartWidth / csvData.length - 0.385;//adjusting the dispersion of the numbers to correspond to the bar position
                    return i * fraction + (fraction - 1) / 2 + leftPadding;
                })
                .attr("y", function(d){
                    if (d[expressed] > 0){                    
                        return chartHeight + yScale(parseFloat(d[expressed])) - 440;//15 here moves the annotation down within the bar
                    }
                    else{
                        return 900 - yScale(parseFloat(d[expressed]));//moves the 0 values up within view
                    }
                })
                .style("fill", function(d){
                    if (d[expressed] > 0){
                        return "white";//styling here will overrides style.css
                    }
                    else{
                        return "black";
                    }
                })
                .style("writing-mode", function(d){
                    if (d[expressed] > 0){
                        return "vertical-rl";//styling numbers to be verticle along bars if greater than 0
                    }
                    else{                        
                        return "horizontal-tb";//horzontal position if 0 or less
                    }
                })                
                .text(function(d){
                    return d[expressed];
                });

            //create a text element for the chart title
            var chartTitle = chart.append("text")
                .attr("x", 40)
                .attr("y", 35)
                .attr("class", "chartTitle")
                .text("Percent Change in NRHP Listings for " + expressed + " in each County");

            //create vertical axis generator
            var yAxis = d3.axisLeft()
                .scale(yScale);

            //place axis
            var axis = chart.append("g")
                .attr("class", "axis")
                .attr("transform", translate)
                .call(yAxis);

     /*           var yAxis = d3.axisLeft(yAxisScale);


            chart.append('g')
                .attr("transform", translate)
                .call(yAxis);*/

            //create frame for chart border
            var chartFrame = chart.append("rect")
                .attr("class", "chartFrame")
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight) 
                .attr("transform", translate);
            
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
        
        //function to create color scale generator - NATURAL BREAKS
        function makeColorScale(data){

            var colorClasses = [
                "#ffffcc",
                "#c2e699",
                "#78c679",
                "#31a354",
                "#006837"
            ];
        
            //create color scale generator
            var colorScale = d3
                .scaleThreshold()
                .domain([-400, -200, -100, -50, 0, 50, 100, 150])
                .range(["none", "#762a83", "#9970ab", "#c2a5cf", "#e7d4e8", "grey", "#d9f0d3", "#a6dba0", "#5aae61"]);
                
                //.range(colorClasses);
        
            //build array of all values of the expressed attribute
           /* var domainArray = [];
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
            colorScale.domain(domainArray);*/
        
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
                    if (value){
                        return colorScale(d.properties[expressed]);
                    }
                    else{
                        return "#bababa";//will return no value or 0 value as grey
                    }                        
                });               
            };        
    
})();

    





