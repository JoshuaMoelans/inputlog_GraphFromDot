document.addEventListener("DOMContentLoaded", function () {
    var network, data;
    var nodeDict;
    var totalSize;
    var selectedNode;
    var options = {
        layout: { 
            randomSeed: 1
        },
        interaction: {
            multiselect: true
        },
        physics: {
            enabled: true
        },
        nodes: {
            widthConstraint: {
                maximum: 200
            },
        },
        edges: {
            color: {
                inherit: false
            }
        }
    };
    var page = document.getElementById("page");
    var container = document.getElementById("mynetwork");
    var info = document.getElementById("infocontent");
    var buttons = document.getElementById("buttons");
    var originalInfoBoxHTML = document.getElementById('infocontent').innerHTML;
    var clusters = new Set();
    var dragging = false;
    var changedNodes = new Map();
    var defaultGraph = "digraph source_graph {\n" +
      "\trankdir=LR;\n" +
      "\tnode [shape=circle style=filled fixedsize=true fontsize=20];\n" +
      "\tsize=\"15\";\n" +
      "\n" +
      "\tnode [width=66 fillcolor=#1856b9 bordercolor=black label=\"Your Document\"] 1\n" +
      "\tnode [width=15 fillcolor=white bordercolor=black label=\"Newspaper\" cluster=\"given sources\"] 2\n" +
      "\tnode [width=6 fillcolor=white bordercolor=black label=\"Web text\" cluster=\"given sources\"] 3\n" +
      "\tnode [width=9 fillcolor=white bordercolor=black label=\"Report\" cluster=\"given sources\"] 4\n" +
      "\tnode [width=0 fillcolor=white bordercolor=black label=\"New Tab - Google Chrome\"] 5\n" +
      "\tnode [width=1 fillcolor=white bordercolor=black label=\"groene maatregelen betekenis - Google Zoeken - Google Chrome\"] 6\n" +
      "\tnode [width=1 fillcolor=white bordercolor=black label=\"groene maatregelen iate - Google Zoeken - Google Chrome\"] 7\n" +
      "\tnode [width=0 fillcolor=white bordercolor=black label=\"groene maatregelen - Google Zoeken - Google Chrome\"] 8\n" +
      "\tnode [width=2 fillcolor=white bordercolor=black label=\"ecologische maatregelen - Google Zoeken - Google Chrome\"] 9\n" +
      "\n" +
      "\t1 -> 2 [label=\"13\" penwidth=13];\n" +
      "\t1 -> 3 [label=\"18\" penwidth=18];\n" +
      "\t1 -> 4 [label=\"11\" penwidth=11];\n" +
      "\t1 -> 5 [label=\"1\" penwidth=1];\n" +
      "\t2 -> 1 [label=\"13\" penwidth=13];\n" +
      "\t2 -> 3 [label=\"1\" penwidth=1];\n" +
      "\t3 -> 1 [label=\"17\" penwidth=17];\n" +
      "\t3 -> 2 [label=\"1\" penwidth=1];\n" +
      "\t3 -> 4 [label=\"1\" penwidth=1];\n" +
      "\t4 -> 1 [label=\"11\" penwidth=11];\n" +
      "\t4 -> 9 [label=\"1\" penwidth=1];\n" +
      "\t5 -> 6 [label=\"1\" penwidth=1];\n" +
      "\t6 -> 7 [label=\"1\" penwidth=1];\n" +
      "\t6 -> 8 [label=\"1\" penwidth=1];\n" +
      "\t7 -> 6 [label=\"1\" penwidth=1];\n" +
      "\t8 -> 9 [label=\"1\" penwidth=1];\n" +
      "\t9 -> 1 [label=\"2\" penwidth=2];\n" +
      "}\n";

    function initializeNetwork() {
        // Set up initial network settings
        page.style.marginLeft = window.innerWidth * 0.03 + "px";
        container.style.width = window.innerWidth * 0.94 + "px";
        container.style.height = window.innerHeight * 0.85 + "px";
        buttons.style.marginTop = window.innerHeight * 0.01 + "px";

        [network, data] = dotToNetwork(defaultGraph, options);
    }

    function loadDotFile() {
        updateInfoBox([]) // clear info box
        // Create an input file
        var input = document.createElement("input");
        input.type = "file";

        // Add an event listener to the input file
        input.addEventListener("change", function() {
            var reader = new FileReader();
            reader.addEventListener("load", function() {
                dotString = reader.result;
                try {
                    network, data = dotToNetwork(dotString);
                    // TODO remove temporary fix below
                    defaultGraph = dotString;
                    initializeNetwork();
                    initializeNetwork();
                } catch (err) {
                    alert("Error loading network: " + err.message);
                }
            });
            reader.readAsText(input.files[0]);
        });

        input.click();
    }

    function saveDotFile() {
        // Get graph data from vis.js
        const nodes = network.body.data.nodes._data;
        const edges = network.body.data.edges._data;
        
        // Build DOT string
        let dotString = 'digraph myGraph {\n';
        dotString += "\trankdir=LR;\n";
        dotString += "\tnode [shape=circle style=filled fixedsize=true fontsize=20];\n";
        dotString += "\tsize=\"15\";\n\n";

        nodes.forEach(node => {
            console.log(node);
            var [label, weight] = [node.title, node.width]; // use title as stored label (actual label has been truncated) and width as weight
            clusterInfo = nodeDict[node.id].cluster ? ` cluster="${nodeDict[node.id].cluster}"` : "";
            dotString += `\tnode [width=${weight} fillcolor=\"${node.color.background}\" bordercolor=${node.color.border} label="${label}"${clusterInfo}] ${node.id};\n`;
        });
        dotString += '\n';

        edges.forEach(edge => {
            dotString += `\t${edge.from} -> ${edge.to} [label="${edge.label}" penwidth=${edge.label}];\n`;
        });
        dotString += '}';

        var blob = new Blob([dotString], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "network.gv");
    }

    function createNetwork() {
        var network = new vis.Network(container, data, options);
        network.on("selectNode", function (params) {
            updateInfoBox(params.nodes);
            console.log(network.body.nodes)
            console.log(network.getSelection().nodes)
        });

        network.on("doubleClick", function (params) {
            openClusters(params.nodes);
        });

        network.on("deselectNode", function (params) {
            updateInfoBox(params.nodes);
            var colorPickerContainer = document.getElementById('colorPickerContainer');
            colorPickerContainer.style.display = 'none';
        });

        network.on("dragStart", function (params) {
            dragging = true;
            var colorPickerContainer = document.getElementById('colorPickerContainer');
            colorPickerContainer.style.display = 'none';
        });

        // Ensure nodes are fixed after dragging
        network.on("dragEnd", function (params) {
            dragging = false;
            for (const [nodeId, changes] of changedNodes) {
                if (network.isCluster(nodeId) === true) {
                    network.clustering.updateClusteredNode(nodeId, {fixed: changes.fixed, color: changes.color});
                }else{
                    network.body.data.nodes.update({id: nodeId, fixed: changes.fixed, color: changes.color});
                    }
                }
            changedNodes.clear();
        })
        return network;
    }

    function updateInfoBox(nodes) {
        var html = "<p><b>Selected Source Categories:</b><p>";
        html += "<div id=\"selected_nodes\">";
        if (nodes.length > 0) {
            var selectedSize = 0;
            for (nodeId of nodes) {
                console.log(nodeId, network.isCluster(nodeId));
                if (network.isCluster(nodeId) === false) {
                    var node = network.body.nodes[nodeId];
                    selectedSize += node.options.width;
                    html += `<p>🌿${node.options.title}</p>`;
                } else {
                    var cluster = network.body.nodes[nodeId];
                    html += `<p>🌳${cluster.options.title}</p>`;
                    html += `<p style="margin-left: 15px;"><b>Category contains links:</b></p>`;
                    for(let node in cluster.containedNodes){  // loop over contained nodes
                        selectedSize += cluster.containedNodes[node].options.width;
                        html += `<p style="margin-left: 30px;">🌿${cluster.containedNodes[node].options.title}</p>`; // add label to info box (TODO maybe fix style setting?)
                    }
                }
            }
            html += "</div>";
            // build actual info box innerHTML
            var selectedPercentage = Math.round(selectedSize);
            info.innerHTML = `<p><b>Total Relative Time Spent:</b> ${selectedPercentage}%</p>`; // start with total relative time spent
            info.innerHTML += `<hr style="margin-top: 1em; margin-bottom: 0.5em;">`;
            info.innerHTML += html;
            // add horizontal line
        } else {
            info.innerHTML = originalInfoBoxHTML;
        }
    }

    function openClusters(nodes) {
        updateInfoBox([]) // clear info box
        for (node of nodes) {
            if (network.isCluster(node) === true) {
                // loop over all nodes in cluster and colour them the same as the cluster node
                var cluster = network.body.nodes[node];
                for(let child_node in cluster.containedNodes){  // loop over contained nodes
                    // set color of node to color of cluster
                    // TODO figure out why this only works after clustering at least twice (sometimes even more needed?) feels funky A.F.
                    network.body.data.nodes.update({id: cluster.containedNodes[child_node].id, color: {background: cluster.options.color.background}});
                }
                network.openCluster(node); // TODO think we lose information on edge labels here, should be fixed
                // reproduce behaviour by clustering the example network, then clicking on a cluster; all outgoing
                // edges' labels are lost. Also, the to-cluster edge label is not correct (values don't seem to be added)
                // we should have at least a value of 7 from MainDoc to SYSTEM but it says 3 (the number of nodes within the cluster our MainDoc node has an edge to)
            } else {
                // allow user to select node color TODO transfer over to nodes when clustering
                var node = network.body.nodes[node];
                document.getElementById('nodeColor').value = node.options.color.background;
                var colorPickerContainer = document.getElementById('colorPickerContainer');
                colorPickerContainer.style.left = event.clientX + 10 + 'px';
                colorPickerContainer.style.top = event.clientY + 5 +'px';
                colorPickerContainer.style.display = 'flex';

                var colorInput = document.getElementById('nodeColor');
                colorInput.style.display = 'block';
                colorInput.focus();
                colorInput.click();

                colorInput.onchange = function() {
                    node.options.color.background = colorInput.value;
                    data.nodes[node.id - 1].color.background = colorInput.value;
                    colorInput.style.display = 'none';
                }
            }
        }
    }

    function createClusters() {
        updateInfoBox([]) // clear info box
        // Cluster nodes based on DOT-defined clusters
        const new_clusters = data.nodes.reduce((acc, node) => { // create local variable new_clusters
            if (node.cluster) {
                if (!acc[node.cluster]) {
                    acc[node.cluster] = [];
                }
                acc[node.cluster].push(node.id);
            }
            return acc;
        }, {});

        // Return if no clusters are defined (so graph doesn't move around)
        var clusterCount = Object.entries(new_clusters).length
        if (clusterCount === 0) return;
        network = createNetwork();

        // Generate colors for each label
        var colors = generateColors(clusterCount) // TODO these could be pre-defined as well; currently they are deterministically 'random'
        for (const [label, nodes] of Object.entries(new_clusters)) {
            var relativeClusterSize = nodes.reduce((acc, node) => {
                return acc + nodeDict[node].width;
            }, 0);
            relativeClusterSize = Math.round(relativeClusterSize);

            var truncatedLabel = label;
            var clusterTruncateSize = 14;
            if (label.length > clusterTruncateSize) {
                truncatedLabel = label.substring(0, clusterTruncateSize) + "...";
            }

            var clusterOptionsByData = {
                joinCondition: function (childOptions) {
                    return childOptions.cluster === label;
                },
                clusterNodeProperties: {
                    id: "cluster:" + label,
                    borderWidth: 3,
                    shape: "dot",
                    color: colors.pop(),
                    label: `🌳${truncatedLabel}\n(${relativeClusterSize}%)`,
                    title: `${label} (${relativeClusterSize}%)`,
                    size: Math.max(relativeClusterSize, 3), // minimum size for nodes
                    width: relativeClusterSize
                },
            };
            network.cluster(clusterOptionsByData);
        }

        clusters.clear();  // clear existing clusters set
        for(cluster of Object.keys(new_clusters)){
            clusters.add(cluster);  // add new clusters to set
        }
    }
    

    function dotToNetwork(dotString, options) {
        // Convert DOT string to network
        var data = vis.parseDOTNetwork(dotString);
        modifyEdges(data.edges);
        modifyNodes(data.nodes);
        var network = createNetwork();
        return [network, data];
    }

    function modifyEdges(edges) {
        // Modify edges based on DOT-defined edge attributes
        for (var i = 0; i < edges.length; i++) {
            // Rename penwidth to width
            edges[i].width = edges[i].penwidth;
            delete edges[i].penwidth;
        }
    }

    function modifyNodes(nodes) {
        nodeDict = {};
        // Modify nodes based on DOT-defined node attributes
        for (var i = 0; i < nodes.length; i++) {
            // Rename width to size
            nodes[i].size = nodes[i].width;

            nodes[i].shape = "dot";
            nodes[i].fixed = {x: false, y: false};

            nodes[i].color = nodes[i].color || {};
            nodes[i].color.border = nodes[i].bordercolor || "black";

            if(nodes[i].cluster){
                clusters.add(nodes[i].cluster);
            }

            // check if label is too long (over labelTruncateSize characters); if this is the case, truncate it & store full label in title (for use in info box)
            nodes[i].title = nodes[i].label;
            var labelTruncateSize = 20;
            if (nodes[i].label.length > labelTruncateSize) {
                nodes[i].label = nodes[i].label.substring(0, labelTruncateSize) + "...";
            }

            nodes[i].chosen = {
                node: function(values, id, selected, hovering) {
                    selectedNode = nodes[id - 1]
                }
            }
        }
        nodes.forEach(element => {
            element.label = element.label + "\n(" + Math.round(element.size) + "%)";
            element.width = element.size;
            element.size = Math.max(3, element.size); // minimum size for nodes
        });
        // loop over nodes and add to newnodedict based on id
        for (var i = 0; i < nodes.length; i++) {
            nodeDict[nodes[i].id] = nodes[i];
        }
    }

    function generateColors(numColors) {
        // Generate colors for clusters
        var colors = [];
        var hueIncrement = 360 / numColors;

        for (var i = 0; i < numColors; i++) {
            var hue = i * hueIncrement;
            var color = 'hsl(' + hue + ', 85%, 65%)';
            colors.push(color);
        }

        return colors;
    }

    // Initial setup
    // TODO: Currently doesn't work if I don't call initializeNetwork() twice, not sure why
    initializeNetwork();
    initializeNetwork();

    // Event listeners
    document.getElementById("clusterButton").addEventListener("click", createClusters);
    document.getElementById("uploadButton").addEventListener("click", loadDotFile);
    document.getElementById("saveButton").addEventListener("click", saveDotFile);
    document.addEventListener("keydown", function(event) {
        if (event.code === "Space") { 
            //TODO: weird behavior with clusters
            for (nodeId of network.getSelection().nodes) {
                var node = network.body.nodes[nodeId];
                console.log(node)
                var fixed = {x: !node.options.fixed.x || dragging, y: !node.options.fixed.y || dragging};
                var color = {background: node.options.color.background, border: (fixed.x ? "red" : "black")};

                if (dragging === true) {
                        changedNodes.set(nodeId, {fixed: fixed, color: color});
                } else {
                    if (network.isCluster(nodeId) === true) {
                        network.clustering.updateClusteredNode(nodeId, {fixed: fixed, color: color});
                    }else{
                        network.body.data.nodes.update({id: node.id, fixed: fixed, color: color}); // TODO nodes is structured differently here
                    }
                }
            }
            // Prevents space from clicking buttons when tabbing accidentally
            event.preventDefault();
        }
        if(event.code === "KeyC" && !event.ctrlKey) {
            // don't create cluster if modal is open
            var modal = document.getElementById('myModal');
            if (modal.style.display === "block") {
                return;
            }
            createNewCluster(network.getSelection().nodes);
        }

        if (event.code === "Escape") {
            var modal = document.getElementById('myModal');
            if (modal.style.display === "block") {
                modal.style.display = "none";
            }else{ // only unselect nodes if modal is not open
                network.unselectAll();
                updateInfoBox([]);
            }
            // hide color picker
            var colorPickerContainer = document.getElementById('colorPickerContainer');
            colorPickerContainer.style.display = 'none';
        }
    });
    function createNewCluster(nodes) {
        // check if at least 2 nodes are selected, OR if a cluster is selected
        if (nodes.length <= 1 && network.isCluster(nodes[0]) === false){
            alert("Please select at least 2 nodes to create a cluster.");
            return;
        };
        // show prompt to get cluster name
        document.getElementById('myModal').style.display = "block";
        setTimeout(function() { // prevent C from being typed in cluster name input field
            var inputField = document.getElementById('clusterName');
            inputField.value = ""; // clear input field
            inputField.focus(); // focus on input field
            inputField.addEventListener('keydown', function(event) {
                if (event.code === "Enter") {
                        document.getElementById('submitClusterName').click();
                    }
            });
        }, 0);

        // populate datalist with existing cluster names
        var clusterNames = document.getElementById('clusterNames');
        clusterNames.innerHTML = "";
        for(cluster of clusters){
            var option = document.createElement('option');
            option.value = cluster;
            clusterNames.appendChild(option);
        }
        document.getElementById('cancelClusterName').onclick = function() {
            document.getElementById('myModal').style.display = "none";
        }
        document.getElementById('submitClusterName').onclick = function() {
            var clusterName = document.getElementById('clusterName').value;
            document.getElementById('myModal').style.display = "none";
            if (clusterName == null || clusterName == "") {
            return;
            }
            clusters.add(clusterName);
            for (node of nodes) {
                // check if cluster
                if(network.isCluster(node) === true){
                    // get all nodes in cluster
                    var cluster = network.body.nodes[node];
                    for(let node in cluster.containedNodes){  // loop over contained nodes
                        // add cluster name to node
                        nodeDict[node].cluster = clusterName;
                    }
                }else{
                    nodeDict[node].cluster = clusterName; // TODO CHECK INDEX MATCHING! 
                }
            }
            // press cluster button
            document.getElementById("clusterButton").click();
        }
}
});

// onload functions
window.onload = function(){
    document.querySelector('#tasks-close-button').addEventListener('click', function() {
        var infobox = document.querySelector('#taskscontent');
        var closeButton = document.querySelector('#tasks-close-button');
        if (infobox.style.display === 'none') {
            infobox.style.display = 'block';
            closeButton.textContent = 'x';
        } else {
            infobox.style.display = 'none';
            closeButton.textContent = 'o';
        }
    });
    
    document.querySelector('#info-close-button').addEventListener('click', function() {
        var infobox = document.querySelector('#infocontent');
        var closeButton = document.querySelector('#info-close-button');
        if (infobox.style.display === 'none') {
            infobox.style.display = 'block';
            closeButton.textContent = 'x';
        } else {
            infobox.style.display = 'none';
            closeButton.textContent = 'o';
        }
    });
}
