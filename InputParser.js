
function generateParser(str, atValue){
	atValue = atValue || "@";
	
	var i = 0;
	var code = "/* " + str + " */\n";
	var needsScanString = false;
	
	var varTypes = {};
	
	function removeWhitespace(str){
		var out = "";
		var inString = false;
		for(var i = 0; i < str.length; ++i){
			if(str[i] == '"') inString = !inString;
			
			if(!inString){
				if(str[i] == ' ' || str[i] == '\r' || str[i] == '\n' || str[i] == '\t') continue;
			}
			
			out += str[i];
		}
		return out;
	}
	
	str = removeWhitespace(str);
	
	function parseFormat(){
		var start = i;
		if(str[i] != '%') throw new Error("Expected %, got " + str[i]);
		++i;
		
		var isIgnored = false;
		if(str[i] == '*'){
			++i;
			isIgnored = true;
		}
		
		var widthStart = i;
		while(/^[0-9]$/.test(str[i])) ++i;
		var widthEnd = i;
		var width = widthStart != widthEnd ? parseInt(str.slice(widthStart, widthEnd), 10) : null;
		
		var length = "";
		if(str[i] == 'h'){
			length += 'h';
			++i;
			if(str[i] == 'h'){
				length += 'h';
				++i;
			}
		}else if(str[i] == 'l'){
			length += 'l';
			++i;
			if(str[i] == 'l'){
				length += 'h';
				++i;
			}
		}else if(str[i] == 'j' || str[i] == 'z' || str[i] =='t' || str[i] == 'L'){
			length += str[i];
			++i;
		}
		
		var specifier = str[i];
		var end = ++i;
		var res = str.slice(start, end);
		
		var type = '?';
		switch(specifier){
			case 'd':
			case 'i':
				switch(length){
					case "":   type = "int"; break;
					case "hh": type = "signed char"; break;
					case "h":  type = "short int"; break;
					case "l":  type = "long int"; break;
					case "ll": type = "long long int"; break;
					case "j":  type = "intmax_t"; break;
					case "z":  type = "size_t"; break;
					case "t":  type = "ptrdiff_t"; break;
					default: throw new Error("Invalid input format " + res);
				}
			break;
			
			case 'u':
			case 'o':
			case 'x':
				switch(length){
					case "":   type = "unsigned int"; break;
					case "hh": type = "unsigned char"; break;
					case "h":  type = "unsigned short int"; break;
					case "l":  type = "unsigned long int"; break;
					case "ll": type = "unsigned long long int"; break;
					case "j":  type = "uintmax_t"; break;
					case "z":  type = "size_t"; break;
					case "t":  type = "ptrdiff_t"; break;
					default: throw new Error("Invalid input format " + res);
				}
			break;
			
			case 'f':
			case 'e':
			case 'g':
			case 'a':
				switch(length){
					case "":  type = "float"; break;
					case "l": type = "double"; break;
					case "L": type = "long double"; break;
					default: throw new Error("Invalid input format " + res);
				}
			break;
			
			case 'c':
				switch(length){
					case "":  type = "char"; break;
					case "l": type = "wchar_t"; break;
					default: throw new Error("Invalid input format " + res);
				}
			break;
			
			case 's':
				switch(length){
					case "":  type = "const char*"; break;
					case "l": type = "const wchar_t*"; break;
					default: throw new Error("Invalid input format " + res);
				}
			break;
			
			case 'p':
				switch(length){
					case "":  type = "void*"; break;
					default: throw new Error("Invalid input format " + res);
				}
			break;
			
			case 'n':
				switch(length){
					case "":   type = "int"; break;
					case "hh": type = "signed char"; break;
					case "h":  type = "short int"; break;
					case "l":  type = "long int"; break;
					case "ll": type = "long long int"; break;
					case "j":  type = "intmax_t"; break;
					case "z":  type = "size_t"; break;
					case "t":  type = "ptrdiff_t"; break;
					default: throw new Error("Invalid input format " + res);
				}
			break;
			
			default: throw new Error("Invalid input format " + res);
		}
		
		var format = isIgnored ? "%" + str.slice(start + 2, end) : res;
		return {
			format: format,
			ignoredFormat: '%*' + format.slice(1),
			isIgnored: isIgnored,
			type: type,
			specifier: specifier,
			length: length,
			width: width
		};
	}
	
	function hasIdentifier(){
		return (/[a-z]/i).test(str[i]);
	}
	
	function hasFormat(){
		return str[i] == '%' && str[i + 1] != '%';
	}
	
	function hasMult(){
		return str[i] == '*';
	}
	
	function parseIdentifier(){
		var start = i++;
		while((/[a-z]/i).test(str[i])) ++i;
		var end = i;
		return str.slice(start, end);
	}
	
	
	function parseExpression(){
		if(hasFormat()){
			var format = parseFormat();
			
			var id = allocTmp();
			
			// If we're not using the result of this expression, discard it
			if(str[i] != '*'){
				return scanf(format, null);
			}
			
			++i;
			
			var tmp = '';
			var aux = allocTmp();
			
			tmp += declVariable(format, id);
			tmp += declVariable(format, aux);
			tmp += scanf(format, id);
			tmp += 'for(' + aux + ' = 0; ' + aux + ' < ' + id + '; ++' + aux + '){\n';
			tmp += parseExpression();
			tmp += '}\n';
			return tmp;
			
		}else if(hasIdentifier()){
			var id = parseIdentifier();
			if(!varTypes.hasOwnProperty(id)) throw new Error("Unknown variable " + id);
			
			if(str[i] != '*') throw new Error("Expected * after " + id + ", got " + str[i]);
			++i;
			
			var aux = allocTmp();
			var tmp = '';
			tmp += 'for(' + varTypes[id] + ' ' + aux + ' = 0; ' + aux + ' < ' + id + '; ++' + aux + '){\n';
			tmp += parseExpression();
			tmp += '}\n';
			return tmp;
		}else if(str[i] == '('){
			++i;
			var tmp = '';
			for(;;){
				if(str[i] == ')') break;
				tmp += parseStatement();
			}
			
			++i;
			return tmp;
		}else if(str[i] == '@'){
			++i;
			return atValue + '\n';
		}else if(str[i] == '"' || (str[i] == '*' && str[i + 1] == '"')){
			var isIgnored = false;
			if(str[i] == '*'){
				++i;
				isIgnored = true;
			}
			
			var start = i;
			++i;
			while(str[i] != '"') ++i;
			var end = ++i;
			var tmp = str.slice(start, end);
			var res = '';
			
			tmp = tmp.replace(/%/g, "%%%%");
			
			// FIXME this almost always returns 0, we need to code a way to check if it was actually successful
			// Maybe get the last character from tmp, remove it, put a %c in its place, and check that?
			res += 'if(scanf(' + tmp + ') != 0) return 1;\n';
			if(!isIgnored) res += 'printf(' + tmp + ');\n';
			return res;
		}
		
		throw new Error("Unexpected character " + str[i]);
	}
	function parseStatement(){
		var backtrack = i;
		if(hasIdentifier()){
			var id = parseIdentifier();
			if(str[i] == '='){
				++i;
				
				if(varTypes.hasOwnProperty(id)){
					throw new Error("Variable already exists: " + id);
				}
				
				var format = parseFormat();
				if(format.specifier == 's'){
					throw new Error("Cannot assign a string to " + id);
				}
				
				var tmp = declVariable(format, id);
				tmp += scanf(format, id);
				varTypes[id] = format.type;
				return tmp;
			}else{
				i = backtrack;
			}
		}
		
		return parseExpression();
	}
	
	
	function declVariable(format, id){
		if(format.specifier == 'c' && format.width != null){
			return format.type + ' ' + id + '[' + format.width + '];\n';
		}
		return format.type + ' ' + id + ';\n';
	}
	
	function scanf(format, id){
		// We cannot use this because the generated scanf always returns 0, so we can't really
		// check if it was successful
		//if(id == null && format.isIgnored){
		//	return 'if(scanf("' + format.ignoredFormat + '") != 0) return 1;\n';
		//}
		
		var tmp = '';
		var hasAmpersand = true;
		if(id == null){
			id = allocTmp();
			tmp += declVariable(format, id);
		}
		
		if(format.specifier == 'c' && format.width != null){
			hasAmpersand = false;
		}
		
		if(format.specifier == 's'){
			if(format.length != "") throw new Error("Scanning wide strings isn't supported yet");
			needsScanString = true;
			tmp += id + ' = scan_string(' + (format.isIgnored ? '0' : '1') + ');\n';
			tmp += 'if(' + id + ' == NULL) return 1;\n'
		}else{
			tmp += 'if(scanf(" ' + format.format + '", ' + (hasAmpersand ? '&' : '') + id + ') != 1) return 1;\n';
			if(!format.isIgnored){
				tmp += 'printf("' + format.format + ' ", ' + id + ');\n';
			}
		}
		
		return tmp;
	}
	
	function countChar(str, ch){
		var c = 0;
		for(var i = 0; i < str.length; ++i){
			if(str[i] == ch) ++c;
		}
		return c;
	}
	
	function formatCode(str, depth){
		depth = depth || 0;
		var res = "";
		
		var lines = str.split('\n');
		for(var i = 0; i < lines.length; ++i){
			var line = lines[i];
			var diff = countChar(line, '{') - countChar(line, '}');
			
			if(diff >= 0){
				for(var j = 0; j < depth; ++j) res += '\t';
				res += line;
				depth += diff;
			}else{
				depth += diff;
				for(var j = 0; j < depth; ++j) res += '\t';
				res += line;
			}
			
			res += '\n';
		}
		return res;
	}
	
	var curVarCode = 0;
	function allocTmp(){
		return "tmp" + curVarCode++;
	}
	
	
	code += '#include <stdio.h>\n';
	code += '#include <stdlib.h>\n';
	code += '#include <ctype.h>\n';
	code += '\n';
	code += 'const char *scan_string(char printBack);\n'
	code += '\n';
	code += 'int main(){\n';
	
	
	while(i < str.length){
		code += formatCode(parseStatement(), 1);
	}
	
	code += '}\n';
	
	code += '\n';
	if(needsScanString){
		code += 'const char *scan_string(char printBack){\n';
		code += '	for(;;){\n';
		code += '		int ch = getchar();\n';
		code += '		if(ch == EOF) return NULL;\n';
		code += '		if(isspace(ch)) continue;\n';
		code += '		break;\n';
		code += '	}\n';
		code += '	\n';
		code += '	int capacity = 64;\n';
		code += '	int len = 0;\n';
		code += '	char *str = malloc(capacity);\n';
		code += '	\n';
		code += '	for(;;){\n';
		code += '		int ch = getchar();\n';
		code += '		if(ch == EOF || isspace(ch)) break;\n';
		code += '		\n';
		code += '		if(len + 2 >= capacity){\n';
		code += '			capacity *= 2;\n';
		code += '			str = realloc(str, capacity);\n';
		code += '		}\n';
		code += '		\n';
		code += '		if(printBack) putchar(ch);\n';
		code += '		str[len++] = ch;\n';
		code += '	}\n';
		code += '	\n';
		code += '	str[len] = 0;\n';
		code += '	if(printBack) putchar(\' \');\n';
		code += '	return str;\n';
		code += '}\n';
	} else {
		code += '/* Code for scan_string not generated: not used */\n';
	}
	
	return code;
}

console.log(generateParser("%*d*(%d*%d @)"));
console.log(generateParser("%*d*(b=%d %d b*%d @)"));
console.log(generateParser("%*d*(%d*(%d %d) @)"));
console.log(generateParser("%*d*(%s @)"));
console.log(generateParser('%*d*"he"'));
console.log(generateParser('%*d**"he"'));
console.log(generateParser('%8c'));
console.log(generateParser("%*d*(%d*(%f %f) @)"));
console.log(generateParser('"should %d %f %s be escaped"'));
console.log(generateParser('%*d*%c'));

