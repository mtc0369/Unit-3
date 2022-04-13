
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
            
        };
    };//end of set map function

        //function for coordinated bar chart - annotated bars
        /*function setChart(csvData, colorScale){            

            //chart frame dimensions
            var chartWidth = window.innerWidth * 0.50,
                chartHeight = 460;              
            
            //creating a 2nd SVG element to hold the bar chart
            var chart = d3
                .select("body")
                .append("svg")
                .attr("width", chartWidth)
                .attr("height", chartHeight)
                .attr("class", "chart");
                //.style("background-color", "gray");//don't need this if styling in CSS

            //create a scale to size bars proportionally to frame
            var yScale = d3
                .scaleLinear()                
                .range([0, chartHeight])
                .domain([0, 115]);//sets the height/length of the bars

            //set bars for each province
            var bars = chart
                .selectAll(".bars")
                .data(csvData)
                .enter()
                .append("rect")
                .sort(function(a, b){
                    return b[expressed]-a[expressed]
                })
                .attr("class", function(d){
                    return "bars " + d.NAME;
                })
                .attr("width", chartWidth / csvData.length - 1)
                .attr("x", function(d, i){
                    return i * (chartWidth / csvData.length);
                })
                .attr("height", function(d){
                    return yScale(parseFloat(d[expressed]));//applying the yScale variable to each attribute to set the height og the bars
                })
                .attr("y", function(d){
                    return chartHeight - yScale(parseFloat(d[expressed]));//scale output subtracted here otherwise the bars would grow downward from the chart 
                })
                .style("fill", function(d){
                    return colorScale(d[expressed]);//applying the colorScale to the bars
                });

            //annotate bars with attribute value text
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
                    var fraction = chartWidth / csvData.length;
                    return i * fraction + (fraction - 1) / 2;
                })
                .attr("y", function(d){
                    if (d[expressed] > 0){                    
                        return chartHeight - yScale(parseFloat(d[expressed])) + 15;//15 here moves the annotation down within the bar
                    }
                    else{
                        return chartHeight - yScale(parseFloat(d[expressed])) - 5;//moves the 0 values up within view
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
                        return "vertical-rl";//styling here will overrides style.css
                    }
                    else{                        
                        return "horizontal-tb";
                    }
                })
                .text(function(d){
                    return d[expressed];
                });

            //create a text element for the chart title
            var chartTitle = chart.append("text")
                .attr("x", 20)
                .attr("y", 35)
                .attr("class", "chartTitle")
                .text("Percent Change in NRHP Listings for " + expressed + " in each County");                
            
        };*/        

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
                .domain([0, 100]);

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
                .attr("height", function(d, i){
                    return 450 - yScale(parseFloat(d[expressed]));
                })
                .attr("y", function(d, i){
                    return yScale(parseFloat(d[expressed])) + topBottomPadding;
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

        /*//function to create color scale generator - QUANTILE
        function makeColorScale(data){
            var colorClasses = [
                "#D4B9DA",
                "#C994C7",
                "#DF65B0",
                "#DD1C77",
                "#980043"
            ];

            //create color scale generator
            var colorScale = d3
                .scaleQuantile()
                .range(colorClasses);

            //build array of all values of the expressed attribute
            var domainArray = [];
            for (var i=0; i<data.length; i++){
                var val = parseFloat(data[i][expressed]);
                domainArray.push(val);
            };

            //assign array of expressed values as scale domain
            colorScale.domain(domainArray);

            return colorScale;
        };*/
        /*//function to create color scale generator - EQUAL INTERVAL
        function makeColorScale(data){
            var colorClasses = [
                "#D4B9DA",
                "#C994C7",
                "#DF65B0",
                "#DD1C77",
                "#980043"
            ];
        
            //create color scale generator
            var colorScale = d3.scaleQuantile()
                .range(colorClasses);
        
            //build two-value array of minimum and maximum expressed attribute values
            var minmax = [
                d3.min(data, function(d) { return parseFloat(d[expressed]); }),
                d3.max(data, function(d) { return parseFloat(d[expressed]); })
            ];
            //assign two-value array as scale domain
            colorScale.domain(minmax);
        
            return colorScale;
        };*/
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
        
            return colorScale;
        };
        
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
                
                /*.style("fill", function(d){
                    return colorScale(d.properties[expressed])//style method to return colors from the colorScale function
                });*/
                /*.style("fill", function(d){
                    if (d.properties[expressed] > 50){
                        return "red";//styling here will overrides style.css - use conditional to style choropleth manually
                    }
                    else{
                        return "blue";
                    }
                        
                });*/
            };            
            
        
    
})();

    





