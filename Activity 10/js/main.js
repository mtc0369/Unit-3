
//anonymous function to wrap script
(function(){    
    
    //begin script when window loads
    window.onload = setMap();

    //pseudo-global variables - accessible to all functions that are called within this anonymous function
    var attrArray = ["y1970s_change", "y1980s_change", "y1990s_change", "y2000s_change", "y2010s_change"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //set up choropleth map
    function setMap(){
        //create map frame
        var width = window.innerWidth * 0.5,
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

        //function for coordinated bar chart
        function setChart(csvData, colorScale){

            //chart frame dimensions
            var chartWidth = window.innerWidth * 0.425,
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
                .domain([0, 105]);

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
            };
            
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
                "#D4B9DA",
                "#C994C7",
                "#DF65B0",
                "#DD1C77",
                "#980043"
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

    





