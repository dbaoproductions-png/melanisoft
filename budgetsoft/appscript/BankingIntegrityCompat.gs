function titreLibelle(s){return String(s||'Opération bancaire').trim().toLowerCase().replace(/(^|[\s'’-])([a-zà-ÿ])/g,function(m,p,c){return p+c.toUpperCase();});}
