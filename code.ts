// This plugin will create a rasterized copy of a Figma Design node

// Default Settings
interface Defaults {
  scaleSize: number,
  xOffset: number,
  yOffset: number,
  scaleMode: ImagePaint["scaleMode"],
  maxImageDimensionSize: number,
};

const defaults: Defaults = {
  scaleSize: 4,
  xOffset: 40,
  yOffset: 0,
  scaleMode: 'FILL',
  maxImageDimensionSize: 4096,
};

// Allow User Parameters
figma.parameters.on('input', ({ key, query, result }) => {
  let suggestions = [];
  switch (key) {
    case 'image-scale-mode':
      suggestions = ["FILL", "FIT", "CROP", "TILE"];
      result.setSuggestions(suggestions);
      break;
    default:
      return;
  }
});

figma.on('run', ({ parameters }: RunEvent) => {
  const nodes: SceneNode[] = [];
  
  // For each selected node, determine image constraints and greater dimension
  for (const node of figma.currentPage.selection) {
    // Check Parameters to Support Relaunch Mode
    let imageScaleMode: ImagePaint["scaleMode"];
    imageScaleMode = parameters && parameters["image-scale-mode"] || node.getPluginData('image-scale-mode') || defaults.scaleMode;
    let nodeWidth = node.width;
    let nodeHeight = node.height;
    let imageConstraintMode: ExportSettingsConstraints['type'] = 'SCALE'
    let exceedsMaxImageSize = false;
    // Identify larger dimension (width vs height)
    let nodeLargerDimension: ExportSettingsConstraints['type'] = nodeWidth > nodeHeight ? 'WIDTH': 'HEIGHT';
    // if the larger dimension when scaled exceeds image size limit, restrict greater dimension to 4096
    if (Math.max(nodeWidth, nodeHeight) * defaults.scaleSize > defaults.maxImageDimensionSize) {
      exceedsMaxImageSize = true;
      imageConstraintMode = nodeLargerDimension;
    }
    // Create Image Version of the Node
    async function createImageOfNode() {
      let exportOfImage = await node.exportAsync({
        format: 'PNG',
        constraint: {
          type: imageConstraintMode, value: exceedsMaxImageSize ? defaults.maxImageDimensionSize : defaults.scaleSize
        }
      });
      let imageOfCopy = figma.createImage(exportOfImage).hash;
      let imageRectangle = figma.createRectangle();
      imageRectangle.name = `${node.name} - Scaled Raster Image`;
      imageRectangle.x = node.x + nodeWidth + defaults.xOffset;
      imageRectangle.y = node.y + defaults.yOffset;
      imageRectangle.resize(nodeWidth, nodeHeight);
      imageRectangle.fills = [{
        type: 'IMAGE', scaleMode: imageScaleMode, imageHash: imageOfCopy
      }];
      nodes.push(imageRectangle);
      // Set Plugin Data to Ensure Scale Mode is Retained for Relaunch
      node.setPluginData('image-scale-mode', imageScaleMode);
      node.setRelaunchData({ run: `Scale Mode: ${imageScaleMode}` });
      // Select Generated Nodes
      figma.currentPage.selection = nodes;
      // Close the Plugin
      figma.closePlugin();
    }
  
    createImageOfNode().catch((e: Error) => figma.closePlugin(e.message));
  
  }
})
