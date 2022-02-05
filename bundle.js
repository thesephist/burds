/* oak build --web */
// module system
const __Oak_Modules = {};
let __Oak_Import_Aliases;
function __oak_modularize(name, fn) {
	__Oak_Modules[name] = fn;
}
function __oak_module_import(name) {
	if (typeof __Oak_Modules[name] === 'object') return __Oak_Modules[name];
	const module = __Oak_Modules[name] || __Oak_Modules[__Oak_Import_Aliases[name]];
	if (module) {
		__Oak_Modules[name] = {}; // break circular imports
		return __Oak_Modules[name] = module();
	} else {
		throw new Error(`Could not import Oak module "${name}" at runtime`);
	}
}

// language primitives
let __oak_empty_assgn_tgt;
function __oak_eq(a, b) {
	a = __as_oak_string(a);
	b = __as_oak_string(b);
	if (a === __Oak_Empty || b === __Oak_Empty) return true;

	// match either null or undefined to compare correctly against undefined ?s
	// appearing in places like optional arguments
	if (a == null && b == null) return true;
	if (a === null || b === null) return false;

	if (typeof a !== typeof b) return false;
	if (__is_oak_string(a) && __is_oak_string(b)) {
		return a.valueOf() === b.valueOf();
	}
	if (typeof a === 'number' || typeof a === 'boolean' ||
		typeof a === 'function' || typeof a === 'symbol') {
		return a === b;
	}

	// deep equality check for composite values
	if (!Array.isArray(a) && typeof a !== 'object') return false;
	if (len(a) !== len(b)) return false;
	for (const key of keys(a)) {
		if (!__oak_eq(a[key], b[key])) return false;
	}
	return true;
}
function __oak_acc(tgt, prop) {
	return __is_oak_string(tgt)
		? __as_oak_string(tgt.valueOf()[prop]) || null
		: tgt[prop] !== undefined
		? tgt[prop]
		: null;
}
function __oak_obj_key(x) {
	return typeof x === 'symbol' ? Symbol.keyFor(x) : x;
}
function __oak_push(a, b) {
	a = __as_oak_string(a);
	a.push(b);
	return a;
}
function __oak_and(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return a && b;
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) & get(b, i));
		}
		return res;
	}
	return a & b;
}
function __oak_or(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return a || b;
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) | get(b, i));
		}
		return res;
	}
	return a | b;
}
function __oak_xor(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return (a && !b) || (!a && b);
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) ^ get(b, i));
		}
		return res;
	}
	return a ^ b;
}
const __Oak_Empty = Symbol('__Oak_Empty');

// mutable string type
function __is_oak_string(x) {
	if (x == null) return false;
	return x.__mark_oak_string;
}
function __as_oak_string(x) {
	if (typeof x === 'string') return __Oak_String(x);
	return x;
}
const __Oak_String = s => {
	if (__is_oak_string(s)) return s;
	return {
		__mark_oak_string: true,
		assign(i, slice) {
			if (i === s.length) return s += slice;
			return s = s.substr(0, i) + slice + s.substr(i + slice.length);
		},
		push(slice) {
			s += slice;
		},
		toString() {
			return s;
		},
		valueOf() {
			return s;
		},
		get length() {
			return s.length;
		},
	}
}

// tail recursion trampoline helpers
function __oak_resolve_trampoline(fn, ...args) {
	let rv = fn(...args);
	while (rv && rv.__is_oak_trampoline) {
		rv = rv.fn(...rv.args);
	}
	return rv;
}
function __oak_trampoline(fn, ...args) {
	return {
		__is_oak_trampoline: true,
		fn: fn,
		args: args,
	}
}

// env (builtin) functions

// reflection and types
const __Is_Oak_Node = typeof process === 'object';
const __Oak_Int_RE = /^[+-]?\d+$/;
function int(x) {
	x = __as_oak_string(x);
	if (typeof x === 'number') {
		// JS rounds towards higher magnitude, Oak rounds towards higher value
		const rounded = Math.floor(x);
		const diff = x - rounded;
		if (x < 0 && diff === 0.5) return rounded + 1;
		return rounded;
	}
	if (__is_oak_string(x) && __Oak_Int_RE.test(x.valueOf())) {
		const i = Number(x.valueOf());
		if (isNaN(i)) return null;
		return i;
	}
	return null;
}
function float(x) {
	x = __as_oak_string(x);
	if (typeof x === 'number') return x;
	if (__is_oak_string(x)) {
		const f = parseFloat(x.valueOf());
		if (isNaN(f)) return null;
		return f;
	}
	return null;
}
function atom(x) {
	x = __as_oak_string(x);
	if (typeof x === 'symbol' && x !== __Oak_Empty) return x;
	if (__is_oak_string(x)) return Symbol.for(x.valueOf());
	return Symbol.for(string(x));
}
function string(x) {
	x = __as_oak_string(x);
	function display(x) {
		x = __as_oak_string(x);
		if (__is_oak_string(x)) {
			return '\'' + x.valueOf().replace('\\', '\\\\').replace('\'', '\\\'') + '\'';
		} else if (typeof x === 'symbol') {
			if (x === __Oak_Empty) return '_';
			return ':' + Symbol.keyFor(x);
		}
		return string(x);
	}
	if (x === null) {
		return '?';
	} else if (typeof x === 'number') {
		return x.toString();
	} else if (__is_oak_string(x)) {
		return x;
	} else if (typeof x === 'boolean') {
		return x.toString();
	} else if (typeof x === 'function') {
		return x.toString();
	} else if (typeof x === 'symbol') {
		if (x === __Oak_Empty) return '_';
		return Symbol.keyFor(x);
	} else if (Array.isArray(x)) {
		return '[' + x.map(display).join(', ') + ']';
	} else if (typeof x === 'object') {
		const entries = [];
		for (const key of keys(x).sort()) {
			entries.push(`${key}: ${display(x[key])}`);
		}
		return '{' + entries.join(', ') + '}';
	}
	throw new Error('string() called on unknown type ' + x.toString());
}
function codepoint(c) {
	c = __as_oak_string(c);
	return c.valueOf().charCodeAt(0);
}
function char(n) {
	return String.fromCharCode(n);
}
function type(x) {
	x = __as_oak_string(x);
	if (x === null) {
		return Symbol.for('null');
	} else if (typeof x === 'number') {
		// Many discrete APIs check for :int, so we consider all integer
		// numbers :int and fall back to :float. This is not an airtight
		// solution, but works well enough and the alternative (tagged number
		// values/types) have poor perf tradeoffs.
		if (Number.isInteger(x)) return Symbol.for('int');
		return Symbol.for('float');
	} else if (__is_oak_string(x)) {
		return Symbol.for('string');
	} else if (typeof x === 'boolean') {
		return Symbol.for('bool');
	} else if (typeof x === 'symbol') {
		if (x === __Oak_Empty) return Symbol.for('empty');
		return Symbol.for('atom');
	} else if (typeof x === 'function') {
		return Symbol.for('function');
	} else if (Array.isArray(x)) {
		return Symbol.for('list');
	} else if (typeof x === 'object') {
		return Symbol.for('object');
	}
	throw new Error('type() called on unknown type ' + x.toString());
}
function len(x) {
	x = __as_oak_string(x);
	if (__is_oak_string(x)) {
		return x.length;
	} else if (Array.isArray(x)) {
		return x.length;
	} else if (typeof x === 'object' && x !== null) {
		return Object.getOwnPropertyNames(x).length;
	}
	throw new Error('len() takes a string or composite value, but got ' + string(x));
}
function keys(x) {
	if (Array.isArray(x)) {
		const k = [];
		for (let i = 0; i < x.length; i ++) k.push(i);
		return k;
	} else if (typeof x === 'object' && x !== null) {
		return Object.getOwnPropertyNames(x).map(__as_oak_string);
	}
	throw new Error('keys() takes a composite value, but got ' + string(x).valueOf());
}

// OS interfaces
function args() {
	if (__Is_Oak_Node) return process.argv.map(__as_oak_string);
	return [window.location.href];
}
function env() {
	if (__Is_Oak_Node) {
		const e = Object.assign({}, process.env);
		for (const key in e) {
			e[key] = __as_oak_string(e[key]);
		}
		return e;
	}
	return {};
}
function time() {
	return Date.now() / 1000;
}
function nanotime() {
	return int(Date.now() * 1000000);
}
function rand() {
	return Math.random();
}
let randomBytes;
function srand(length) {
	if (__Is_Oak_Node) {
		// lazily import dependency
		if (!randomBytes) randomBytes = require('crypto').randomBytes;
		return randomBytes(length).toString('latin1');
	}

	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return __as_oak_string(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
}
function wait(duration, cb) {
	setTimeout(cb, duration * 1000);
	return null;
}
function exit(code) {
	if (__Is_Oak_Node) process.exit(code);
	return null;
}
function exec() {
	throw new Error('exec() not implemented');
}

// I/O
function input() {
	throw new Error('input() not implemented');
}
function print(s) {
	s = __as_oak_string(s);
	if (__Is_Oak_Node) {
		process.stdout.write(string(s).toString());
	} else {
		console.log(string(s).toString());
	}
	return s.length;
}
function ls() {
	throw new Error('ls() not implemented');
}
function rm() {
	throw new Error('rm() not implemented');
}
function mkdir() {
	throw new Error('mkdir() not implemented');
}
function stat() {
	throw new Error('stat() not implemented');
}
function open() {
	throw new Error('open() not implemented');
}
function close() {
	throw new Error('close() not implemented');
}
function read() {
	throw new Error('read() not implemented');
}
function write() {
	throw new Error('write() not implemented');
}
function listen() {
	throw new Error('listen() not implemented');
}
function req() {
	throw new Error('req() not implemented');
}

// math
function sin(n) {
	return Math.sin(n);
}
function cos(n) {
	return Math.cos(n);
}
function tan(n) {
	return Math.tan(n);
}
function asin(n) {
	return Math.asin(n);
}
function acos(n) {
	return Math.acos(n);
}
function atan(n) {
	return Math.atan(n);
}
function pow(b, n) {
	return Math.pow(b, n);
}
function log(b, n) {
	return Math.log(n) / Math.log(b);
}

// runtime
function ___runtime_lib() {
	throw new Error('___runtime_lib() not implemented');
}
function ___runtime_lib__oak_qm() {
	throw new Error('___runtime_lib?() not implemented');
}

// JavaScript interop
function bind(target, fn) {
	const fnName = Symbol.keyFor(fn);
	return target[fnName].bind(target);
}
function __oak_js_new(Constructor, ...args) {
	return new Constructor(...args);
}
(__oak_modularize(__Oak_String(``),function _(){return ((BurdPopulation,Burds,Canvas,Ctx,DPI,DrawHeight,DrawWidth,FootprintTrail,Footprints,JumpDistance,JumpDuration,JumpHeight,MaxScale,addHandler,angle,append,arcBetween,ctxCall,__oak_js_default,draw,drawBurd,drawFootprint,drawShadow,each,ellipse,filter,handleResize,jumpRandomBurd,line,map,math,merge,midJumpBurd,normAngle,println,querySelector,random,range,slice,sort,squish,startDrawing,startJumping)=>(({println,__oak_js_default,range,slice,map,each,merge,filter,append}=__oak_module_import(__Oak_String(`std`))),(math=__oak_module_import(__Oak_String(`math`))),(sort=__oak_module_import(__Oak_String(`sort`))),(random=__oak_module_import(__Oak_String(`random`))),(DPI=__oak_js_default(((__oak_acc_tgt)=>__oak_acc_tgt.devicePixelRatio!==undefined?__oak_acc_tgt.devicePixelRatio:null)(window),1)),(MaxScale=5),(JumpDuration=0.25),(JumpHeight=0.5),(JumpDistance=12),(FootprintTrail=8),(DrawWidth=((__oak_acc_tgt)=>__oak_acc_tgt.innerWidth!==undefined?__oak_acc_tgt.innerWidth:null)(window)),(DrawHeight=((__oak_acc_tgt)=>__oak_acc_tgt.innerHeight!==undefined?__oak_acc_tgt.innerHeight:null)(window)),(querySelector=bind(document,Symbol.for('querySelector'))),addHandler=function addHandler(el=null,name=null,handler=null){return bind(el,Symbol.for('addEventListener'))(string(name),handler)},(Canvas=querySelector(__Oak_String(`canvas`))),(Ctx=bind(Canvas,Symbol.for('getContext'))(__Oak_String(`2d`))),ctxCall=function ctxCall(name=null,...args){return bind(Ctx,name)(...args)},angle=function angle(deg=null){return ((deg/180)*((__oak_acc_tgt)=>__oak_acc_tgt.Pi!==undefined?__oak_acc_tgt.Pi:null)(math))},normAngle=function normAngle(t=null){return ((__as_oak_string(t+(2*((__oak_acc_tgt)=>__oak_acc_tgt.Pi!==undefined?__oak_acc_tgt.Pi:null)(math))))%((2*((__oak_acc_tgt)=>__oak_acc_tgt.Pi!==undefined?__oak_acc_tgt.Pi:null)(math))))},squish=function squish(point=null,center=null,t=null){return ((cx,cy,x,y)=>(([x,y=null]=point),([cx,cy=null]=center),[__as_oak_string(cx+(((x-cx))*cos(t))),__as_oak_string(cy+(((y-cy))*(__as_oak_string(1+(0.9*((__oak_acc_tgt)=>__oak_acc_tgt.abs!==undefined?__oak_acc_tgt.abs:null)(math)(sin(t)))))))]))()},line=function line(start=null,end=null){return (ctxCall(Symbol.for('beginPath')),ctxCall(Symbol.for('moveTo'),__oak_acc(start,0),__oak_acc(start,1)),ctxCall(Symbol.for('lineTo'),__oak_acc(end,0),__oak_acc(end,1)),ctxCall(Symbol.for('stroke')))},ellipse=function ellipse(center=null,rx=null,ry=null){return (ctxCall(Symbol.for('beginPath')),ctxCall(Symbol.for('ellipse'),__oak_acc(center,0),__oak_acc(center,1),rx,ry,0,0,(2*((__oak_acc_tgt)=>__oak_acc_tgt.Pi!==undefined?__oak_acc_tgt.Pi:null)(math))),ctxCall(Symbol.for('fill')))},arcBetween=function arcBetween(start=null,end=null,radius=null,dir=null,mode=null){return ((arcdist,cx,cy,dist,endAngle,epsilon,startAngle,u,v)=>((epsilon=((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('counterclock'))?1:__oak_eq(__oak_cond,Symbol.for('clock'))?-1:null)(dir)),(dist=((__oak_acc_tgt)=>__oak_acc_tgt.hypot!==undefined?__oak_acc_tgt.hypot:null)(math)(__oak_acc(start,0),__oak_acc(start,1),__oak_acc(end,0),__oak_acc(end,1))),(arcdist=((__oak_acc_tgt)=>__oak_acc_tgt.sqrt!==undefined?__oak_acc_tgt.sqrt:null)(math)(((radius*radius)-((dist*dist)/4)))),(u=(((__oak_acc(end,0)-__oak_acc(start,0)))/dist)),(v=(((__oak_acc(end,1)-__oak_acc(start,1)))/dist)),(cx=(((__as_oak_string(__oak_acc(start,0)+__oak_acc(end,0)))/2)-((epsilon*arcdist)*v))),(cy=__as_oak_string(((__as_oak_string(__oak_acc(start,1)+__oak_acc(end,1)))/2)+((epsilon*arcdist)*u))),(startAngle=((__oak_acc_tgt)=>__oak_acc_tgt.orient!==undefined?__oak_acc_tgt.orient:null)(math)(cx,cy,__oak_acc(start,0),__oak_acc(start,1))),(endAngle=((__oak_acc_tgt)=>__oak_acc_tgt.orient!==undefined?__oak_acc_tgt.orient:null)(math)(cx,cy,__oak_acc(end,0),__oak_acc(end,1))),ctxCall(Symbol.for('beginPath')),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('counterclock'))?ctxCall(Symbol.for('arc'),cx,cy,radius,startAngle,endAngle):__oak_eq(__oak_cond,Symbol.for('clock'))?ctxCall(Symbol.for('arc'),cx,cy,radius,endAngle,startAngle):null)(dir),ctxCall(mode)))()},drawFootprint=function drawFootprint(fp=null){return ((FpRadius,Scale,legSpan)=>((Scale=((((__oak_acc_tgt)=>__oak_acc_tgt.y!==undefined?__oak_acc_tgt.y:null)(fp)/DrawHeight)*MaxScale)),(FpRadius=(1*Scale)),(legSpan=(1.5*Scale)),ellipse([__as_oak_string(((__oak_acc_tgt)=>__oak_acc_tgt.x!==undefined?__oak_acc_tgt.x:null)(fp)+legSpan),((__oak_acc_tgt)=>__oak_acc_tgt.y!==undefined?__oak_acc_tgt.y:null)(fp)],FpRadius,(FpRadius/2)),ellipse([(((__oak_acc_tgt)=>__oak_acc_tgt.x!==undefined?__oak_acc_tgt.x:null)(fp)-legSpan),((__oak_acc_tgt)=>__oak_acc_tgt.y!==undefined?__oak_acc_tgt.y:null)(fp)],FpRadius,(FpRadius/2))))()},drawShadow=function drawShadow(burd=null){return ((Scale,dir,shadowRadiusX,shadowRadiusY,x,y,z)=>(({x,y,z,direction:dir=null}=burd),(Scale=((y/DrawHeight)*MaxScale)),(shadowRadiusX=((4*Scale)*(__as_oak_string(1+(0.5*((__oak_acc_tgt)=>__oak_acc_tgt.abs!==undefined?__oak_acc_tgt.abs:null)(math)(cos(dir))))))),(shadowRadiusY=(2*Scale)),ellipse([x,(y-z)],shadowRadiusX,shadowRadiusY)))()},drawBurd=function drawBurd(burd=null){return ((Scale,attitude,bodyCenter,bodyHalfLength,clockBodyRadius,color,counterclockBodyRadius,dir,facing,flatBellyRadius,headAtt,headEnd,headLength,headPoint,legLength,legSpan,midBellyRadius,roundBellyRadius,tailPoint,x,y,z)=>(({x,y,z,direction:dir=null,color}=burd),(Scale=(((__oak_acc_tgt)=>__oak_acc_tgt.scale!==undefined?__oak_acc_tgt.scale:null)(math)(y,0,DrawHeight,0.1,1)*MaxScale)),(facing=((__oak_cond)=>__oak_eq(__oak_cond,(dir<angle(70)))?Symbol.for('east'):__oak_eq(__oak_cond,(dir>angle((360-70))))?Symbol.for('east'):__oak_eq(__oak_cond,(dir<angle((180-70))))?Symbol.for('north'):__oak_eq(__oak_cond,(dir<angle(__as_oak_string(180+70))))?Symbol.for('west'):Symbol.for('south'))(true)),(legSpan=(1.5*Scale)),(legLength=(6*Scale)),(bodyCenter=[__as_oak_string(x+((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('east'))?(-1*Scale):__oak_eq(__oak_cond,Symbol.for('west'))?(1*Scale):0)(facing)),(y-(11*Scale))]),(bodyHalfLength=(8*Scale)),(attitude=angle(30)),(headPoint=squish(((__oak_acc_tgt)=>__oak_acc_tgt.bearing!==undefined?__oak_acc_tgt.bearing:null)(math)(__oak_acc(bodyCenter,0),__oak_acc(bodyCenter,1),bodyHalfLength,-attitude),bodyCenter,dir)),(tailPoint=squish(((__oak_acc_tgt)=>__oak_acc_tgt.bearing!==undefined?__oak_acc_tgt.bearing:null)(math)(__oak_acc(bodyCenter,0),__oak_acc(bodyCenter,1),bodyHalfLength,__as_oak_string(-attitude+((__oak_acc_tgt)=>__oak_acc_tgt.Pi!==undefined?__oak_acc_tgt.Pi:null)(math))),bodyCenter,dir)),(headLength=(8*Scale)),(headAtt=((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('east'))?angle(-30):__oak_eq(__oak_cond,Symbol.for('west'))?angle(__as_oak_string(180+30)):((__oak_cond)=>__oak_eq(__oak_cond,(dir<angle(90)))?angle(-10):__oak_eq(__oak_cond,(dir>angle(270)))?angle(-10):angle(__as_oak_string(180+10)))(true))(facing)),(headEnd=((__oak_acc_tgt)=>__oak_acc_tgt.bearing!==undefined?__oak_acc_tgt.bearing:null)(math)(__oak_acc(headPoint,0),__oak_acc(headPoint,1),headLength,-headAtt)),(roundBellyRadius=(8.75*Scale)),(flatBellyRadius=(25*Scale)),(midBellyRadius=(10.5*Scale)),([clockBodyRadius,counterclockBodyRadius=null]=((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('east'))?[flatBellyRadius,roundBellyRadius]:__oak_eq(__oak_cond,Symbol.for('west'))?[roundBellyRadius,flatBellyRadius]:[midBellyRadius,midBellyRadius])(facing)),Symbol.for('legs'),(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(lineWidth,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.lineWidth):(__oak_assgn_tgt.lineWidth)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Ctx),(Scale/2)),line([__as_oak_string(x+legSpan),y],[__as_oak_string(x+legSpan),(y-legLength)]),line([(x-legSpan),y],[(x-legSpan),(y-legLength)])),Symbol.for('body'),(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(fillStyle,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.fillStyle):(__oak_assgn_tgt.fillStyle)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Ctx),color),arcBetween(headPoint,tailPoint,clockBodyRadius,Symbol.for('clock'),Symbol.for('fill')),arcBetween(headPoint,tailPoint,counterclockBodyRadius,Symbol.for('counterclock'),Symbol.for('fill')),arcBetween(headPoint,tailPoint,clockBodyRadius,Symbol.for('clock'),Symbol.for('stroke')),arcBetween(headPoint,tailPoint,counterclockBodyRadius,Symbol.for('counterclock'),Symbol.for('stroke'))),Symbol.for('head'),(line(headPoint,headEnd))))()},midJumpBurd=function midJumpBurd(burd=null){return ((Scale,c,color,destX,destY,dir,jumpY,jumped,movingX,movingY,t,x,y)=>(({x,y,direction:dir=null,jumped,color}=burd),(Scale=((y/DrawHeight)*MaxScale)),(t=((__oak_acc_tgt)=>__oak_acc_tgt.scale!==undefined?__oak_acc_tgt.scale:null)(math)(time(),jumped,__as_oak_string(jumped+JumpDuration))),([destX,destY=null]=((__oak_acc_tgt)=>__oak_acc_tgt.bearing!==undefined?__oak_acc_tgt.bearing:null)(math)(x,y,(JumpDistance*Scale),-dir)),(c=((((4*JumpHeight)*Scale)/JumpDuration)/JumpDuration)),(jumpY=((c*t)*((t-1)))),(movingX=((__oak_acc_tgt)=>__oak_acc_tgt.scale!==undefined?__oak_acc_tgt.scale:null)(math)(t,0,1,x,destX)),(movingY=__as_oak_string(((__oak_acc_tgt)=>__oak_acc_tgt.scale!==undefined?__oak_acc_tgt.scale:null)(math)(t,0,1,y,destY)+jumpY)),({x:movingX,y:movingY,z:jumpY,direction:dir,color})))()},draw=function draw(){return ((JumpedBurds)=>(ctxCall(Symbol.for('setTransform'),DPI,0,0,DPI,0,0),ctxCall(Symbol.for('clearRect'),0,0,((__oak_acc_tgt)=>__oak_acc_tgt.width!==undefined?__oak_acc_tgt.width:null)(Canvas),((__oak_acc_tgt)=>__oak_acc_tgt.height!==undefined?__oak_acc_tgt.height:null)(Canvas)),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(lineCap,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.lineCap):(__oak_assgn_tgt.lineCap)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Ctx),__Oak_String(`round`)),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(lineJoin,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.lineJoin):(__oak_assgn_tgt.lineJoin)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Ctx),__Oak_String(`round`)),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(strokeStyle,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.strokeStyle):(__oak_assgn_tgt.strokeStyle)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Ctx),__Oak_String(`#000000`)),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(fillStyle,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.fillStyle):(__oak_assgn_tgt.fillStyle)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Ctx),__Oak_String(`#cccccc`)),each(Footprints,drawFootprint),(JumpedBurds=map(Burds,function _(burd=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?burd:midJumpBurd(burd))(((__oak_acc_tgt)=>__oak_acc_tgt.jumped!==undefined?__oak_acc_tgt.jumped:null)(burd))})),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(fillStyle,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.fillStyle):(__oak_assgn_tgt.fillStyle)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Ctx),__Oak_String(`rgba(0, 0, 0, 0.2)`)),each(JumpedBurds,drawShadow),each(((__oak_acc_tgt)=>__oak_acc_tgt.sort!==undefined?__oak_acc_tgt.sort:null)(sort)(JumpedBurds,function _(b=null){return (((__oak_acc_tgt)=>__oak_acc_tgt.y!==undefined?__oak_acc_tgt.y:null)(b)-((__oak_acc_tgt)=>__oak_acc_tgt.z!==undefined?__oak_acc_tgt.z:null)(b))}),drawBurd)))()},handleResize=function handleResize(){return ((DrawWidth=((__oak_acc_tgt)=>__oak_acc_tgt.innerWidth!==undefined?__oak_acc_tgt.innerWidth:null)(window)),(DrawHeight=((__oak_acc_tgt)=>__oak_acc_tgt.innerHeight!==undefined?__oak_acc_tgt.innerHeight:null)(window)),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(width,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.width):(__oak_assgn_tgt.width)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Canvas),int((DrawWidth*DPI))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(height,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.height):(__oak_assgn_tgt.height)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(Canvas),int((DrawHeight*DPI))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(width,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.width):(__oak_assgn_tgt.width)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(((__oak_acc_tgt)=>__oak_acc_tgt.style!==undefined?__oak_acc_tgt.style:null)(Canvas)),__as_oak_string(string(DrawWidth)+__Oak_String(`px`))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(height,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.height):(__oak_assgn_tgt.height)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(((__oak_acc_tgt)=>__oak_acc_tgt.style!==undefined?__oak_acc_tgt.style:null)(Canvas)),__as_oak_string(string(DrawHeight)+__Oak_String(`px`))),draw())},(BurdPopulation=((__oak_acc_tgt)=>__oak_acc_tgt.max!==undefined?__oak_acc_tgt.max:null)(math)(((__oak_acc_tgt)=>__oak_acc_tgt.min!==undefined?__oak_acc_tgt.min:null)(math)((((DrawWidth*DrawHeight)/50000)),50),6)),(Burds=map(range(BurdPopulation),function _(n=null){return ({x:((__oak_acc_tgt)=>__oak_acc_tgt.number!==undefined?__oak_acc_tgt.number:null)(random)(5,(DrawWidth-5)),y:((__oak_acc_tgt)=>__oak_acc_tgt.number!==undefined?__oak_acc_tgt.number:null)(random)(5,(DrawHeight-5)),z:0,direction:((__oak_acc_tgt)=>__oak_acc_tgt.number!==undefined?__oak_acc_tgt.number:null)(random)(0,(2*((__oak_acc_tgt)=>__oak_acc_tgt.Pi!==undefined?__oak_acc_tgt.Pi:null)(math))),color:((__oak_acc_tgt)=>__oak_acc_tgt.choice!==undefined?__oak_acc_tgt.choice:null)(random)([__Oak_String(`#000000`),__Oak_String(`#f0eff1`)])})})),(Footprints=[]),jumpRandomBurd=function jumpRandomBurd(){return ((burd)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?((MaxFootprints)=>(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(jumped,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.jumped):(__oak_assgn_tgt.jumped)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(burd),time()),__oak_push(Footprints,({x:((__oak_acc_tgt)=>__oak_acc_tgt.x!==undefined?__oak_acc_tgt.x:null)(burd),y:((__oak_acc_tgt)=>__oak_acc_tgt.y!==undefined?__oak_acc_tgt.y:null)(burd)})),(MaxFootprints=int((BurdPopulation*FootprintTrail))),((__oak_cond)=>__oak_eq(__oak_cond,true)?((Footprints=slice(Footprints,(len(Footprints)-MaxFootprints)))):null)((len(Footprints)>MaxFootprints)),wait(JumpDuration,function _(){return ((Scale,direction,x,y)=>((Scale=((((__oak_acc_tgt)=>__oak_acc_tgt.y!==undefined?__oak_acc_tgt.y:null)(burd)/DrawHeight)*MaxScale)),([x,y=null]=((__oak_acc_tgt)=>__oak_acc_tgt.bearing!==undefined?__oak_acc_tgt.bearing:null)(math)(((__oak_acc_tgt)=>__oak_acc_tgt.x!==undefined?__oak_acc_tgt.x:null)(burd),((__oak_acc_tgt)=>__oak_acc_tgt.y!==undefined?__oak_acc_tgt.y:null)(burd),(JumpDistance*Scale),-((__oak_acc_tgt)=>__oak_acc_tgt.direction!==undefined?__oak_acc_tgt.direction:null)(burd))),(direction=normAngle(((__oak_cond)=>__oak_eq(__oak_cond,(x<50))?((__oak_acc_tgt)=>__oak_acc_tgt.orient!==undefined?__oak_acc_tgt.orient:null)(math)(x,-y,(DrawWidth/2),(-DrawHeight/2)):__oak_eq(__oak_cond,(x>(DrawWidth-50)))?((__oak_acc_tgt)=>__oak_acc_tgt.orient!==undefined?__oak_acc_tgt.orient:null)(math)(x,-y,(DrawWidth/2),(-DrawHeight/2)):__oak_eq(__oak_cond,(y<50))?((__oak_acc_tgt)=>__oak_acc_tgt.orient!==undefined?__oak_acc_tgt.orient:null)(math)(x,-y,(DrawWidth/2),(-DrawHeight/2)):__oak_eq(__oak_cond,(y>(DrawHeight-50)))?((__oak_acc_tgt)=>__oak_acc_tgt.orient!==undefined?__oak_acc_tgt.orient:null)(math)(x,-y,(DrawWidth/2),(-DrawHeight/2)):__as_oak_string(((__oak_acc_tgt)=>__oak_acc_tgt.direction!==undefined?__oak_acc_tgt.direction:null)(burd)+((__oak_acc_tgt)=>__oak_acc_tgt.number!==undefined?__oak_acc_tgt.number:null)(random)(angle(-30),angle(30))))(true))),merge(burd,({x,y,direction,jumped:null}))))()})))():null)(!__oak_eq(null,(burd=((__oak_acc_tgt)=>__oak_acc_tgt.choice!==undefined?__oak_acc_tgt.choice:null)(random)(filter(Burds,function _(b=null){return __oak_eq(((__oak_acc_tgt)=>__oak_acc_tgt.jumped!==undefined?__oak_acc_tgt.jumped:null)(b),null)})))))))()},startDrawing=function startDrawing(){return (draw(),requestAnimationFrame(startDrawing))},startJumping=function startJumping(){return (wait((1/BurdPopulation),function _(){return (jumpRandomBurd(),startJumping())}))},handleResize(),addHandler(window,Symbol.for('resize'),handleResize),addHandler(querySelector(__Oak_String(`.hideButton`)),Symbol.for('click'),function _(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(display,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.display):(__oak_assgn_tgt.display)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(((__oak_acc_tgt)=>__oak_acc_tgt.style!==undefined?__oak_acc_tgt.style:null)(querySelector(__Oak_String(`#attribution`)))),__Oak_String(`none`)))}),startDrawing(),startJumping(),({BurdPopulation,Burds,Canvas,Ctx,DPI,DrawHeight,DrawWidth,FootprintTrail,Footprints,JumpDistance,JumpDuration,JumpHeight,MaxScale,addHandler,angle,append,arcBetween,ctxCall,__oak_js_default,draw,drawBurd,drawFootprint,drawShadow,each,ellipse,filter,handleResize,jumpRandomBurd,line,map,math,merge,midJumpBurd,normAngle,println,querySelector,random,range,slice,sort,squish,startDrawing,startJumping})))()}),__oak_modularize(__Oak_String(`math`),function _(){return ((E,Pi,abs,bearing,__oak_js_default,hypot,max,min,orient,reduce,round,scale,sign,sqrt,sum)=>(({__oak_js_default,reduce}=__oak_module_import(__Oak_String(`std`))),(Pi=3.141592653589793),(E=2.718281828459045),sign=function sign(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?1:-1)((n>=0))},abs=function abs(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?n:-n)((n>=0))},sqrt=function sqrt(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?pow(n,0.5):null)((n>=0))},hypot=function hypot(x0=null,y0=null,x1=null,y1=null){return (((__oak_cond)=>__oak_eq(__oak_cond,true)?(x1=(y1=0)):null)(__oak_and(__oak_eq(x1,null),__oak_eq(y1,null))),sqrt(__as_oak_string((((x0-x1))*((x0-x1)))+(((y0-y1))*((y0-y1))))))},scale=function scale(x=null,a=null,b=null,c=null,d=null){return ((normed)=>((normed=(((x-a))/((b-a)))),((__oak_cond)=>__oak_eq(__oak_cond,__oak_and(__oak_eq(c,null),__oak_eq(d,null)))?normed:__as_oak_string((((d-c))*normed)+c))(true)))()},bearing=function bearing(x=null,y=null,d=null,t=null){return [__as_oak_string(x+(d*cos(t))),__as_oak_string(y+(d*sin(t)))]},orient=function orient(x0=null,y0=null,x1=null,y1=null){return ((x,y)=>(([x,y=null]=((__oak_cond)=>__oak_eq(__oak_cond,true)?[x0,y0]:[(x1-x0),(y1-y0)])(__oak_and(__oak_eq(x1,null),__oak_eq(y1,null)))),((__oak_cond)=>__oak_eq(__oak_cond,(x>0))?(2*atan((y/(__as_oak_string(hypot(x,y)+x))))):__oak_eq(__oak_cond,__oak_and((x<=0),!__oak_eq(y,0)))?(2*atan((((hypot(x,y)-x))/y))):__oak_eq(__oak_cond,__oak_and((x<0),__oak_eq(y,0)))?Pi:null)(true)))()},sum=function sum(...xs){return reduce(xs,0,function _(a=null,b=null){return __as_oak_string(a+b)})},min=function min(...xs){return reduce(xs,__oak_acc(xs,0),function _(acc=null,n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?n:acc)((n<acc))})},max=function max(...xs){return reduce(xs,__oak_acc(xs,0),function _(acc=null,n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?n:acc)((n>acc))})},round=function round(n=null,decimals=null){return ((decimals=__oak_js_default(int(decimals),0)),((__oak_cond)=>__oak_eq(__oak_cond,true)?n:((order)=>((order=pow(10,decimals)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(int(__as_oak_string((n*order)+0.5))/order):(-int(__as_oak_string((-n*order)+0.5))/order))((n>=0))))())((decimals<0)))},({E,Pi,abs,bearing,__oak_js_default,hypot,max,min,orient,reduce,round,scale,sign,sqrt,sum})))()}),__oak_modularize(__Oak_String(`random`),function _(){return ((boolean,choice,integer,map,number,split,toHex)=>(({toHex,map}=__oak_module_import(__Oak_String(`std`))),({split}=__oak_module_import(__Oak_String(`str`))),boolean=function boolean(){return (rand()>0.5)},integer=function integer(min=null,max=null){return int(number(int(min),int(max)))},number=function number(min=null,max=null){return (((__oak_cond)=>__oak_eq(__oak_cond,true)?([min,max=null]=[0,min]):null)(__oak_eq(max,null)),__as_oak_string(min+(rand()*((max-min)))))},choice=function choice(list=null){return __oak_acc(list,__oak_obj_key((integer(0,len(list)))))},({boolean,choice,integer,map,number,split,toHex})))()}),__oak_modularize(__Oak_String(`sort`),function _(){return ((clone,__oak_js_default,id,map,sort,sort__oak_exclam)=>(({__oak_js_default,identity:id=null,map,clone}=__oak_module_import(__Oak_String(`std`))),sort__oak_exclam=function sort__oak_exclam(xs=null,pred=null){return ((partition,quicksort,vpred)=>((pred=__oak_js_default(pred,id)),(vpred=map(xs,pred)),partition=function partition(xs=null,lo=null,hi=null){return ((lsub,pivot,rsub,sub)=>((pivot=__oak_acc(vpred,__oak_obj_key((lo)))),lsub=function lsub(i=null){return ((__oak_trampolined_lsub)=>((__oak_trampolined_lsub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_lsub,__as_oak_string(i+1)):i)((__oak_acc(vpred,__oak_obj_key((i)))<pivot))}),__oak_resolve_trampoline(__oak_trampolined_lsub,i)))()},rsub=function rsub(j=null){return ((__oak_trampolined_rsub)=>((__oak_trampolined_rsub=function _(j=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_rsub,(j-1)):j)((__oak_acc(vpred,__oak_obj_key((j)))>pivot))}),__oak_resolve_trampoline(__oak_trampolined_rsub,j)))()},sub=function sub(i=null,j=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null,j=null){return ((i=lsub(i)),(j=rsub(j)),((__oak_cond)=>__oak_eq(__oak_cond,false)?j:((tmp,tmpPred)=>((tmp=__oak_acc(xs,__oak_obj_key((i)))),(tmpPred=__oak_acc(vpred,__oak_obj_key((i)))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((i),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((i))]):(__oak_assgn_tgt[__oak_obj_key((i))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(xs),__oak_acc(xs,__oak_obj_key((j)))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((j),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((j))]):(__oak_assgn_tgt[__oak_obj_key((j))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(xs),tmp),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((i),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((i))]):(__oak_assgn_tgt[__oak_obj_key((i))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(vpred),__oak_acc(vpred,__oak_obj_key((j)))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((j),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((j))]):(__oak_assgn_tgt[__oak_obj_key((j))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(vpred),tmpPred),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1),(j-1))))())((i<j)))}),__oak_resolve_trampoline(__oak_trampolined_sub,i,j)))()},sub(lo,hi)))()},quicksort=function quicksort(xs=null,lo=null,hi=null){return ((__oak_trampolined_quicksort)=>((__oak_trampolined_quicksort=function _(xs=null,lo=null,hi=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?xs:__oak_eq(__oak_cond,1)?xs:((__oak_cond)=>__oak_eq(__oak_cond,false)?xs:((p)=>((p=partition(xs,lo,hi)),quicksort(xs,lo,p),__oak_trampoline(__oak_trampolined_quicksort,xs,__as_oak_string(p+1),hi)))())((lo<hi)))(len(xs))}),__oak_resolve_trampoline(__oak_trampolined_quicksort,xs,lo,hi)))()},quicksort(xs,0,(len(xs)-1))))()},sort=function sort(xs=null,pred=null){return sort__oak_exclam(clone(xs),pred)},({clone,__oak_js_default,id,map,sort,sort__oak_exclam})))()}),__oak_modularize(__Oak_String(`std`),function _(){return ((_asPredicate,_baseIterator,_hToN,_nToH,append,clamp,clone,compact,contains__oak_qm,debounce,__oak_js_default,each,entries,every,filter,find,first,flatten,fromHex,identity,indexOf,join,last,loop,map,merge,once,partition,println,range,reduce,reverse,slice,some,toHex,uniq,values,zip)=>(identity=function identity(x=null){return x},_baseIterator=function _baseIterator(v=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?__Oak_String(``):__oak_eq(__oak_cond,Symbol.for('list'))?[]:__oak_eq(__oak_cond,Symbol.for('object'))?({}):null)(type(v))},_asPredicate=function _asPredicate(pred=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('atom'))?((prop)=>((prop=string(pred)),function _(x=null){return __oak_acc(x,__oak_obj_key((prop)))}))():__oak_eq(__oak_cond,Symbol.for('string'))?function _(x=null){return __oak_acc(x,__oak_obj_key((pred)))}:__oak_eq(__oak_cond,Symbol.for('int'))?function _(x=null){return __oak_acc(x,__oak_obj_key((pred)))}:pred)(type(pred))},__oak_js_default=function __oak_js_default(x=null,base=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?base:x)(x)},(_nToH=__Oak_String(`0123456789abcdef`)),toHex=function toHex(n=null){return ((sub)=>(sub=function sub(p=null,acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(p=null,acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__as_oak_string(__oak_acc(_nToH,__oak_obj_key((p)))+acc):__oak_trampoline(__oak_trampolined_sub,int((p/16)),__as_oak_string(__oak_acc(_nToH,__oak_obj_key(((p%16))))+acc)))((p<16))}),__oak_resolve_trampoline(__oak_trampolined_sub,p,acc)))()},sub(int(n),__Oak_String(``))))()},(_hToN=({0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,a:10,A:10,b:11,B:11,c:12,C:12,d:13,D:13,e:14,E:14,f:15,F:15})),fromHex=function fromHex(s=null){return ((sub)=>(sub=function sub(i=null,acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null,acc=null){let next;return ((__oak_cond)=>__oak_eq(__oak_cond,__oak_eq(i,len(s)))?acc:__oak_eq(__oak_cond,!__oak_eq(null,(next=__oak_acc(_hToN,__oak_obj_key((__oak_acc(s,__oak_obj_key((i)))))))))?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1),__as_oak_string((acc*16)+next)):null)(true)}),__oak_resolve_trampoline(__oak_trampolined_sub,i,acc)))()},sub(0,0)))()},clamp=function clamp(min=null,max=null,n=null,m=null){return ((n=((__oak_cond)=>__oak_eq(__oak_cond,true)?min:n)((n<min))),(m=((__oak_cond)=>__oak_eq(__oak_cond,true)?min:m)((m<min))),(m=((__oak_cond)=>__oak_eq(__oak_cond,true)?max:m)((m>max))),(n=((__oak_cond)=>__oak_eq(__oak_cond,true)?m:n)((n>m))),[n,m])},slice=function slice(xs=null,min=null,max=null){return ((sub)=>((min=__oak_js_default(min,0)),(max=__oak_js_default(max,len(xs))),([min,max=null]=clamp(0,len(xs),min,max)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,__oak_acc(xs,__oak_obj_key((i)))),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),min)))()},clone=function clone(x=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?__as_oak_string(__Oak_String(``)+x):__oak_eq(__oak_cond,Symbol.for('list'))?slice(x):__oak_eq(__oak_cond,Symbol.for('object'))?reduce(keys(x),({}),function _(acc=null,key=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((key),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((key))]):(__oak_assgn_tgt[__oak_obj_key((key))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(acc),__oak_acc(x,__oak_obj_key((key))))}):x)(type(x))},append=function append(xs=null,ys=null){return ((xlen)=>((xlen=len(xs)),each(ys,function _(y=null,i=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((__as_oak_string(xlen+i)),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((__as_oak_string(xlen+i)))]):(__oak_assgn_tgt[__oak_obj_key((__as_oak_string(xlen+i)))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(xs),y)}),xs))()},join=function join(xs=null,ys=null){return append(clone(xs),ys)},range=function range(start=null,end=null,step=null){return ((step=__oak_js_default(step,1)),((__oak_cond)=>__oak_eq(__oak_cond,true)?([start,end=null]=[0,start]):null)(__oak_eq(end,null)),((__oak_cond)=>__oak_eq(__oak_cond,true)?[]:((list,sub)=>((list=[]),((__oak_cond)=>__oak_eq(__oak_cond,true)?sub=function sub(n=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(list,n),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(n+step))):list)((n<end))}),__oak_resolve_trampoline(__oak_trampolined_sub,n)))()}:sub=function sub(n=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(list,n),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(n+step))):list)((n>end))}),__oak_resolve_trampoline(__oak_trampolined_sub,n)))()})((step>0)),sub(start)))())(__oak_eq(step,0)))},reverse=function reverse(xs=null){return ((sub)=>(sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,__oak_acc(xs,__oak_obj_key((i)))),(i-1)))((i<0))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),(len(xs)-1))))()},map=function map(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,f(__oak_acc(xs,__oak_obj_key((i))),i)),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),0)))()},each=function each(xs=null,f=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?null:(f(__oak_acc(xs,__oak_obj_key((i))),i),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},filter=function filter(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:((x)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,x):null)(f((x=__oak_acc(xs,__oak_obj_key((i)))),i)),__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1))))())(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),0)))()},reduce=function reduce(xs=null,seed=null,f=null){return ((sub)=>(sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:__oak_trampoline(__oak_trampolined_sub,f(acc,__oak_acc(xs,__oak_obj_key((i))),i),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(seed,0)))()},flatten=function flatten(xs=null){return reduce(xs,[],append)},compact=function compact(xs=null){return filter(xs,function _(x=null){return !__oak_eq(x,null)})},some=function some(xs=null,pred=null){return ((pred=__oak_js_default(pred,identity)),reduce(xs,false,function _(acc=null,x=null,i=null){return __oak_or(acc,pred(x,i))}))},every=function every(xs=null,pred=null){return ((pred=__oak_js_default(pred,identity)),reduce(xs,true,function _(acc=null,x=null,i=null){return __oak_and(acc,pred(x,i))}))},zip=function zip(xs=null,ys=null,zipper=null){return ((max,sub)=>((zipper=__oak_js_default(zipper,function _(x=null,y=null){return [x,y]})),(max=((__oak_cond)=>__oak_eq(__oak_cond,true)?len(xs):len(ys))((len(xs)<len(ys)))),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,zipper(__oak_acc(xs,__oak_obj_key((i))),__oak_acc(ys,__oak_obj_key((i))),i)),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub([],0)))()},partition=function partition(xs=null,by=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('int'))?reduce(xs,[],function _(acc=null,x=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?__oak_push(acc,[x]):(__oak_push(__oak_acc(acc,__oak_obj_key(((len(acc)-1)))),x),acc))((i%by))}):__oak_eq(__oak_cond,Symbol.for('function'))?((last)=>((last=function _(){return null}),reduce(xs,[],function _(acc=null,x=null){return ((__oak_js_this)=>(((__oak_cond)=>__oak_eq(__oak_cond,last)?__oak_push(__oak_acc(acc,__oak_obj_key(((len(acc)-1)))),x):__oak_push(acc,[x]))((__oak_js_this=by(x))),(last=__oak_js_this),acc))()})))():null)(type(by))},uniq=function uniq(xs=null,pred=null){return ((last,sub,ys)=>((pred=__oak_js_default(pred,identity)),(ys=_baseIterator(xs)),(last=function _(){return null}),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){let p;let x;return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?ys:((__oak_cond)=>__oak_eq(__oak_cond,last)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):(__oak_push(ys,x),(last=p),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1))))((p=pred((x=__oak_acc(xs,__oak_obj_key((i))))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},first=function first(xs=null){return __oak_acc(xs,0)},last=function last(xs=null){return __oak_acc(xs,__oak_obj_key(((len(xs)-1))))},find=function find(xs=null,pred=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?-1:((__oak_cond)=>__oak_eq(__oak_cond,true)?i:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)))(pred(__oak_acc(xs,__oak_obj_key((i))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},indexOf=function indexOf(xs=null,x=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?-1:((__oak_cond)=>__oak_eq(__oak_cond,x)?i:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)))(__oak_acc(xs,__oak_obj_key((i)))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},contains__oak_qm=function contains__oak_qm(xs=null,x=null){return (indexOf(xs,x)>-1)},values=function values(obj=null){return map(keys(obj),function _(key=null){return __oak_acc(obj,__oak_obj_key((key)))})},entries=function entries(obj=null){return map(keys(obj),function _(key=null){return [key,__oak_acc(obj,__oak_obj_key((key)))]})},merge=function merge(...os){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?null:reduce(os,__oak_acc(os,0),function _(acc=null,o=null){return (reduce(keys(o),acc,function _(root=null,k=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((k),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((k))]):(__oak_assgn_tgt[__oak_obj_key((k))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(root),__oak_acc(o,__oak_obj_key((k))))}))}))(len(os))},once=function once(f=null){return ((called__oak_qm)=>((called__oak_qm=false),function _(...args){return ((__oak_cond)=>__oak_eq(__oak_cond,called__oak_qm)?null:((called__oak_qm=true),f(...args)))(true)}))()},loop=function loop(max=null,f=null){return ((breaker,broken,sub)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?((f=max),(max=-1)):null)(__oak_eq(f,null)),(max=__oak_js_default(max,-1)),(broken=false),breaker=function breaker(){return (broken=true)},sub=function sub(count=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(count=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?null:((__oak_cond)=>__oak_eq(__oak_cond,true)?null:(f(count,breaker),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(count+1))))(broken))(count)}),__oak_resolve_trampoline(__oak_trampolined_sub,count)))()},sub(0)))()},debounce=function debounce(duration=null,firstCall=null,f=null){return ((dargs,debounced,target,waiting__oak_qm)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?([firstCall,f=null]=[Symbol.for('trailing'),firstCall]):null)(__oak_eq(f,null)),(dargs=null),(waiting__oak_qm=false),(target=(time()-duration)),debounced=function debounced(...args){return ((tcall)=>((tcall=time()),(dargs=args),((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?((target=__as_oak_string(tcall+duration)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('leading'))?f(...dargs):__oak_eq(__oak_cond,Symbol.for('trailing'))?((waiting__oak_qm=true),wait((target-time()),function _(){return ((waiting__oak_qm=false),f(...dargs))})):null)(firstCall)):((timeout)=>((waiting__oak_qm=true),(timeout=(target-tcall)),(target=__as_oak_string(target+duration)),wait(timeout,function _(){return ((waiting__oak_qm=false),f(...dargs))})))())((target<=tcall)):null)(!waiting__oak_qm)))()}))()},println=function println(...xs){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?print(__Oak_String(`
`)):((out)=>((out=reduce(slice(xs,1),string(__oak_acc(xs,0)),function _(acc=null,x=null){return (__as_oak_string(__as_oak_string(acc+__Oak_String(` `))+string(x)))})),print(__as_oak_string(out+__Oak_String(`
`)))))())(len(xs))},({_asPredicate,_baseIterator,_hToN,_nToH,append,clamp,clone,compact,contains__oak_qm,debounce,__oak_js_default,each,entries,every,filter,find,first,flatten,fromHex,identity,indexOf,join,last,loop,map,merge,once,partition,println,range,reduce,reverse,slice,some,toHex,uniq,values,zip})))()}),__oak_modularize(__Oak_String(`str`),function _(){return ((_extend,_matchesAt__oak_qm,_replaceNonEmpty,_splitNonEmpty,_trimEndNonEmpty,_trimSpace,_trimStartNonEmpty,checkRange,contains__oak_qm,cut,__oak_js_default,digit__oak_qm,endsWith__oak_qm,indexOf,join,letter__oak_qm,lower,lower__oak_qm,map,padEnd,padStart,reduce,replace,slice,space__oak_qm,split,startsWith__oak_qm,trim,trimEnd,trimStart,upper,upper__oak_qm,word__oak_qm)=>(({__oak_js_default,map,slice,reduce}=__oak_module_import(__Oak_String(`std`))),checkRange=function checkRange(lo=null,hi=null){let checker;return checker=function checker(c=null){return ((p)=>((p=codepoint(c)),__oak_and((lo<=p),(p<=hi))))()}},(upper__oak_qm=checkRange(codepoint(__Oak_String(`A`)),codepoint(__Oak_String(`Z`)))),(lower__oak_qm=checkRange(codepoint(__Oak_String(`a`)),codepoint(__Oak_String(`z`)))),(digit__oak_qm=checkRange(codepoint(__Oak_String(`0`)),codepoint(__Oak_String(`9`)))),(space__oak_qm=function _(c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(` `))?true:__oak_eq(__oak_cond,__Oak_String(`	`))?true:__oak_eq(__oak_cond,__Oak_String(`
`))?true:__oak_eq(__oak_cond,__Oak_String(``))?true:__oak_eq(__oak_cond,__Oak_String(``))?true:false)(c)}),letter__oak_qm=function letter__oak_qm(c=null){return __oak_or(upper__oak_qm(c),lower__oak_qm(c))},word__oak_qm=function word__oak_qm(c=null){return __oak_or(letter__oak_qm(c),digit__oak_qm(c))},join=function join(strings=null,joiner=null){return ((joiner=__oak_js_default(joiner,__Oak_String(``))),((__oak_cond)=>__oak_eq(__oak_cond,0)?__Oak_String(``):reduce(slice(strings,1),__oak_acc(strings,0),function _(a=null,b=null){return __as_oak_string(__as_oak_string(a+joiner)+b)}))(len(strings)))},startsWith__oak_qm=function startsWith__oak_qm(s=null,prefix=null){return reduce(prefix,true,function _(acc=null,c=null,i=null){return (__oak_and(acc,(__oak_eq(__oak_acc(s,__oak_obj_key((i))),c))))})},endsWith__oak_qm=function endsWith__oak_qm(s=null,suffix=null){return ((diff)=>((diff=(len(s)-len(suffix))),reduce(suffix,true,function _(acc=null,c=null,i=null){return (__oak_and(acc,(__oak_eq(__oak_acc(s,__oak_obj_key((__as_oak_string(i+diff)))),c))))})))()},_matchesAt__oak_qm=function _matchesAt__oak_qm(s=null,substr=null,idx=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?true:__oak_eq(__oak_cond,1)?__oak_eq(__oak_acc(s,__oak_obj_key((idx))),substr):((max,sub)=>((max=len(substr)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?true:((__oak_cond)=>__oak_eq(__oak_cond,__oak_acc(substr,__oak_obj_key((i))))?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):false)(__oak_acc(s,__oak_obj_key((__as_oak_string(idx+i))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))())(len(substr))},indexOf=function indexOf(s=null,substr=null){return ((max,sub)=>((max=(len(s)-len(substr))),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?i:((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):-1)((i<max)))(_matchesAt__oak_qm(s,substr,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},contains__oak_qm=function contains__oak_qm(s=null,substr=null){return (indexOf(s,substr)>=0)},cut=function cut(s=null,sep=null){let idx;return ((__oak_cond)=>__oak_eq(__oak_cond,-1)?[s,__Oak_String(``)]:[slice(s,0,idx),slice(s,__as_oak_string(idx+len(sep)))])((idx=indexOf(s,sep)))},lower=function lower(s=null){return reduce(s,__Oak_String(``),function _(acc=null,c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,char(__as_oak_string(codepoint(c)+32))):__oak_push(acc,c))(upper__oak_qm(c))})},upper=function upper(s=null){return reduce(s,__Oak_String(``),function _(acc=null,c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,char((codepoint(c)-32))):__oak_push(acc,c))(lower__oak_qm(c))})},_replaceNonEmpty=function _replaceNonEmpty(s=null,old=null,__oak_js_new=null){return ((lnew,lold,sub)=>((lold=len(old)),(lnew=len(__oak_js_new)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(__as_oak_string(slice(acc,0,i)+__oak_js_new)+slice(acc,__as_oak_string(i+lold))),__as_oak_string(i+lnew)):((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1)):acc)((i<len(acc))))(_matchesAt__oak_qm(acc,old,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(s,0)))()},replace=function replace(s=null,old=null,__oak_js_new=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?s:_replaceNonEmpty(s,old,__oak_js_new))(old)},_splitNonEmpty=function _splitNonEmpty(s=null,sep=null){return ((coll,lsep,sub)=>((coll=[]),(lsep=len(sep)),sub=function sub(acc=null,i=null,last=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null,last=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(coll,slice(acc,last,i)),__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+lsep),__as_oak_string(i+lsep))):((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1),last):__oak_push(coll,slice(acc,last)))((i<len(acc))))(_matchesAt__oak_qm(acc,sep,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i,last)))()},sub(s,0,0)))()},split=function split(s=null,sep=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?reduce(s,[],function _(acc=null,c=null){return __oak_push(acc,c)}):__oak_eq(__oak_cond,__Oak_String(``))?reduce(s,[],function _(acc=null,c=null){return __oak_push(acc,c)}):_splitNonEmpty(s,sep))(sep)},_extend=function _extend(pad=null,n=null){return ((part,sub,times)=>((times=int((n/len(pad)))),(part=(n%len(pad))),sub=function sub(base=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(base=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?__oak_push(base,slice(pad,0,part)):__oak_trampoline(__oak_trampolined_sub,__oak_push(base,pad),(i-1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,base,i)))()},sub(__Oak_String(``),times)))()},padStart=function padStart(s=null,n=null,pad=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?s:__oak_push(_extend(pad,(n-len(s))),s))((len(s)>=n))},padEnd=function padEnd(s=null,n=null,pad=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?s:__as_oak_string(s+_extend(pad,(n-len(s)))))((len(s)>=n))},_trimStartNonEmpty=function _trimStartNonEmpty(s=null,prefix=null){return ((idx,lpref,max,sub)=>((max=len(s)),(lpref=len(prefix)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+lpref)):i)(_matchesAt__oak_qm(s,prefix,i)):i)((i<max))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},(idx=sub(0)),slice(s,idx)))()},trimStart=function trimStart(s=null,prefix=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?s:_trimStartNonEmpty(s,prefix))(prefix)},_trimEndNonEmpty=function _trimEndNonEmpty(s=null,suffix=null){return ((idx,lsuf,sub)=>((lsuf=len(suffix)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,(i-lsuf)):i)(_matchesAt__oak_qm(s,suffix,(i-lsuf))):i)((i>-1))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},(idx=sub(len(s))),slice(s,0,idx)))()},trimEnd=function trimEnd(s=null,suffix=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?s:_trimEndNonEmpty(s,suffix))(suffix)},_trimSpace=function _trimSpace(s=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?s:((firstNonSpace,lastNonSpace,subEnd,subStart)=>(subStart=function subStart(i=null){return ((__oak_trampolined_subStart)=>((__oak_trampolined_subStart=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_subStart,__as_oak_string(i+1)):i)(space__oak_qm(__oak_acc(s,__oak_obj_key((i)))))}),__oak_resolve_trampoline(__oak_trampolined_subStart,i)))()},(firstNonSpace=subStart(0)),subEnd=function subEnd(i=null){return ((__oak_trampolined_subEnd)=>((__oak_trampolined_subEnd=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_subEnd,(i-1)):i)(space__oak_qm(__oak_acc(s,__oak_obj_key((i)))))}),__oak_resolve_trampoline(__oak_trampolined_subEnd,i)))()},(lastNonSpace=subEnd((len(s)-1))),slice(s,firstNonSpace,__as_oak_string(lastNonSpace+1))))())(s)},trim=function trim(s=null,part=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?_trimSpace(s):trimStart(trimEnd(s,part),part))(part)},({_extend,_matchesAt__oak_qm,_replaceNonEmpty,_splitNonEmpty,_trimEndNonEmpty,_trimSpace,_trimStartNonEmpty,checkRange,contains__oak_qm,cut,__oak_js_default,digit__oak_qm,endsWith__oak_qm,indexOf,join,letter__oak_qm,lower,lower__oak_qm,map,padEnd,padStart,reduce,replace,slice,space__oak_qm,split,startsWith__oak_qm,trim,trimEnd,trimStart,upper,upper__oak_qm,word__oak_qm})))()}),(__Oak_Import_Aliases=({})),__oak_module_import(__Oak_String(``)))