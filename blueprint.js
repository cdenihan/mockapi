// YAML Blueprint Extractor - streaming architecture
// Zero dependencies - custom implementation

class BlueprintExtractor {
  extractFrom(textualData) {
    const dataStructure = { __root: {} };
    const breadcrumbTrail = [dataStructure.__root];
    const indentHistory = [-1];
    
    textualData.split('\n').forEach(rawLine => {
      if (this._shouldIgnoreLine(rawLine)) return;
      
      const indentDepth = this._measureIndent(rawLine);
      const trimmedText = rawLine.trim();
      
      // Adjust breadcrumb trail based on indent changes
      while (indentHistory[indentHistory.length - 1] >= indentDepth && indentHistory.length > 1) {
        breadcrumbTrail.pop();
        indentHistory.pop();
      }
      
      if (trimmedText.startsWith('- ')) {
        this._handleListItem(trimmedText.substring(2), breadcrumbTrail, indentHistory, indentDepth);
      } else if (trimmedText.includes(':')) {
        this._handleMapping(trimmedText, breadcrumbTrail, indentHistory, indentDepth);
      }
    });
    
    return dataStructure.__root;
  }
  
  _shouldIgnoreLine(text) {
    const clean = text.trim();
    return clean === '' || clean.startsWith('#');
  }
  
  _measureIndent(text) {
    let count = 0;
    for (const ch of text) {
      if (ch === ' ') count++;
      else break;
    }
    return count;
  }
  
  _handleListItem(content, trail, history, depth) {
    const currentScope = trail[trail.length - 1];
    
    if (!Array.isArray(currentScope.__activeList)) {
      return;
    }
    
    if (content.includes(':')) {
      const colonIdx = content.indexOf(':');
      const mappingKey = content.substring(0, colonIdx).trim();
      const mappingValue = content.substring(colonIdx + 1).trim();
      
      const itemObject = {};
      if (mappingValue) {
        itemObject[mappingKey] = this._coerceType(mappingValue);
      }
      currentScope.__activeList.push(itemObject);
      
      // Set up for nested properties
      trail.push(itemObject);
      history.push(depth);
    } else {
      currentScope.__activeList.push(this._coerceType(content));
    }
  }
  
  _handleMapping(text, trail, history, depth) {
    const colonIdx = text.indexOf(':');
    const mappingKey = text.substring(0, colonIdx).trim();
    const mappingValue = text.substring(colonIdx + 1).trim();
    
    const currentScope = trail[trail.length - 1];
    
    if (mappingValue) {
      // Direct value assignment
      if (Array.isArray(currentScope)) {
        // Adding property to object in array
        const lastItem = currentScope[currentScope.length - 1];
        if (typeof lastItem === 'object' && lastItem !== null) {
          lastItem[mappingKey] = this._coerceType(mappingValue);
        }
      } else {
        currentScope[mappingKey] = this._coerceType(mappingValue);
      }
    } else {
      // Collection starter
      currentScope[mappingKey] = [];
      currentScope.__activeList = currentScope[mappingKey];
      
      trail.push(currentScope);
      history.push(depth);
    }
  }
  
  _coerceType(rawText) {
    if (rawText === 'true') return true;
    if (rawText === 'false') return false;
    if (rawText === 'null') return null;
    
    if (/^-?\d+$/.test(rawText)) return parseInt(rawText, 10);
    if (/^-?\d+\.\d+$/.test(rawText)) return parseFloat(rawText);
    
    if ((rawText[0] === '"' && rawText[rawText.length - 1] === '"') ||
        (rawText[0] === "'" && rawText[rawText.length - 1] === "'")) {
      return rawText.slice(1, -1);
    }
    
    return rawText;
  }
}

export default BlueprintExtractor;
