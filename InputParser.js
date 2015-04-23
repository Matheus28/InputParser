
function generateParser(str){
	var i = 0;
	
	var varTypes = {};
	
	function parseFormat(){
		var start = i;
		if(str[i] != '%') throw new Error("Expected %, got " + str[i]);
		++i;
		
		var isIgnored = false;
		if(str[i] == '*'){
			++i;
			isIgnored = true;
		}
		
		while(/^[0-9]$/.test(str[i])) ++i;
		
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
					case "":  type = "STRING"; break;
					case "l": type = "WSTRING"; break;
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
			specifier: specifier
		};
	}
	
	function hasIdentifier(){
		return (/[a-z]/i).test(str[i]);
	}
	
	function hasFormat(){
		return str[i] == '%';
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
			
			// Discard it?
			if(str[i] != '*'){
				return scanf(format, null);
			}
			
			++i;
			
			var tmp = '';
			var aux = allocTmp();
			
			tmp += format.type + ' ' + id + ', ' + aux + ';\n';
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
			return '@\n';
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
				
				var tmp = format.type + ' ' + id + ';\n';
				tmp += scanf(format, id);
				varTypes[id] = format.type;
				return tmp;
			}else{
				i = backtrack;
			}
		}
		
		return parseExpression();
	}
	
	
	function scanf(format, id){
		if(id == null && format.isIgnored){
			return 'scanf("' + format.ignoredFormat + '");\n';
		}else{
			if(id == null) id = allocTmp();
			
			var tmp = 'scanf("' + format.format + '", &' + id + ');\n';
			if(!format.isIgnored){
				tmp += 'printf("' + format.format + '", ' + id + ');\n';
			}
			return tmp;
		}
	}
	
	var curVarCode = 0;
	function allocTmp(){
		return "tmp" + curVarCode++;
	}
	
	var code = "";
	
	code += '#include <stdio.h>\n';
	code += '#include <stdlib.h>\n';
	code += '\n';
	code += 'int main(){\n';
	
	str = str.replace(/\s+/g, '');
	
	while(i < str.length){
		code += parseStatement();
	}
	
	code += '}\n';
	
	return code;
}

console.log(generateParser("%*d*(%d*%d @)"));
console.log(generateParser("%*d*(b=%d %d b*%d @)"));
console.log(generateParser("%*d*(%d*(%d %d) @)"));
console.log(generateParser("%*d*(%s @)"));