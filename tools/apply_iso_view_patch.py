from pathlib import Path
import re

html_path = Path('Melanisoft_finition_rose.html')
text = html_path.read_text(encoding='utf-8')

start = text.index('function buildIsoSampleByTitle(jpegRows,tiffRows){')
end = text.index('function populateReco(){', start)
replacement = r'''function imageLogicalKey(row){
  return normKey(baseNoExt(row&&row.name||''));
}
function buildIsoSampleByTitle(jpegRows,tiffRows){
  const