
import BlockMirror from './dist/block_mirror.js';    
// import Blockly from './lib/blockly/blockly_compressed.js';

window.editor = new BlockMirror({
    'container': document.getElementById('blockmirror-editor'),
    blocklyMediaPath: '../lib/blockly/media/',
    imageMode: true,
    imageDownloadHOok: (oldUrl) => {
        return oldUrl;
    },
    imageUploadHook: (blob) => {
        return Promise.resolve("Image("+JSON.stringify(URL.createObjectURL(blob))+")");
    },
    imageLiteralHook: (oldUrl) => {
        return `Image("${oldUrl}")`;
    },
    //'height': '2000px'
});

editor.addChangeListener(function (event) {
    console.log('Change! Better save:', event)
});

function Download(){
    var file_name = "check.xml"
    console.log("Check xml");
    console.log(editor.getXml());

    const blob = new Blob([editor.getXml().outerHTML], {type:'text/plain'});
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = file_name.value;
    document.body.appendChild(a);

    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
    console.log("Download!");
}


var default_code = 'max_label = labels.max()\nprint(f"point cloud has {max_label + 1} clusters")\ncolors = plt.get_cmap("Accent")(labels / (max_label if max_label > 0 else 1))\ncolors[labels < 0] = 0\npcd.colors = o3d.utility.Vector3dVector(colors[:, :3])';
editor.setCode('pcd_point_cloud = o3d.data.DemoCropPointCloud()\npcd = o3d.io.read_point_cloud(pcd_point_cloud.point_cloud_path)\nwith o3d.utility.VerbosityContextManager(\n    o3d.utility.VerbosityLevel.Debug) as cm:\n    labels = np.array(\n        pcd.cluster_dbscan(eps=0.1, min_points=10, print_progress=True)\n    )\nmax_label = labels.max()\nprint(f"point cloud has {max_label + 1} clusters")\ncolors = plt.get_cmap("Accent")(labels / (max_label if max_label > 0 else 1))\ncolors[labels < 0] = 0\npcd.colors = o3d.utility.Vector3dVector(colors[:, :3])\n\nbunny = o3d.data.BunnyMesh()\nbunny_mesh = o3d.io.read_triangle_mesh(bunny.path)\nbunny_mesh.compute_vertex_normals()\nbunny_mesh.transform([[-1, 0, 0, 0], \n                      [0, 1, 0, 0], \n                      [0, 0, 1, 0], \n                      [0, 0, 0, 1]])\nbunny_mesh.translate([2.5, 2.1, 1.2])');
// editor.summarizeBlock([0], default_code, true);
var savedXml = editor.saveXml(editor.getCode());

Sk.configure({
    __future__: Sk.python3,
    read: function (filename) {
        if (Sk.builtinFiles === undefined ||
            Sk.builtinFiles["files"][filename] === undefined) {
            throw "File not found: '" + filename + "'";
        }
        return Sk.builtinFiles["files"][filename];
    }
});

$("#make-image").click(function() {
    editor.blockEditor.getPngFromBlocks((u, i)=> $("#image-spot").html(i));
});

$('#go').click(function () {
    /*alert('Starting!')
    var filename = 'main';
    var code = `import pedal`;
    //console.time('Run');
    Sk.importMainWithBody(filename, false, code, true).$d;
    //console.timeEnd('Run');
    alert('Done!')*/
    runTests();
});

var TESTS = [
    'for ___ in ___:\n    pass',
    '0',
    '0\n0\n0\n0\n',
    'for ___ in ___:\n    0\n    0',
    'for x in y:\n    pass',
    '1 + 1',
    '(1 * 3 + 4) + 6 & 8',
    '(1 + 2) - (3 * 4) / 5 | 7 & (8 % 9 << 10) >> 11 // 12',
    'not 4',
    '+1\n-2\n~4\nnot 5\nnot not not 4',
    '1 or 2',
    '1 and 2 and 3 or 4 and 5 or 3 or 4',
    '1 < 5',
    '(2 < 3) < 4',
    '(((4 > 3) < 2) > 2) < 2',
    '5 is 4',
    '___ in ___',
    '3 is not 4',
    '(1 is 2) is 3',
    '(((((((1 == 2) != 3) <= 4) >= 5) in 3) not in 3) is 4) is not 5',
    '1 < 2 and 3 < 4',
    'assert (1 < 2)',
    'assert (1 > 4), ___',
    '"Hello \'world.\'"',
    "'Hello \"there.\"'",
    'alpha\nbeta\ngamma',
    'alpha\nalpha\nalpha',
    'True\nFalse\nNone',
    '[]\n[1, 2, 3]\n[1, 2, 4, 5]\n()\n(1, 2, 3)\n(1, 2)\n(1, )\n(1, 2, 3, 4, 5)',
    '{1, 2, 3}\n{1}\n{4, 5, 6, 7}',
    "{1: 2, 'Hello': 'World'}\n{}",
    '{*{}}',
    "0 if True else False",
    "dog.growl\nalpha.beta.gamma\n'Test'.save",
    'alpha\nalpha(1)\nbeta(2)\nbeta',
    'alpha(beta)\nalpha.beta(gamma)\nhello(1, 2, 3)\nfor a in b:\n    (corgi(run))',
    'sorted([1, 2, 3], reverse=True)',
    'complex(1, 2, *first, *second, **big, **dog, third=3, fourth=4)',
    "raise\nraise Exception()\nraise Exception() from wherever",
    "del alpha\ndel alpha, beta, gamma",
    "simple[0]\nranged[1:2]\nranged[:2]\nranged[1:]\nranged[:]",
    "ranged[::3]\nranged[1::3]\nranged[:2:3]\nranged[1:2:3]",
    // acbart: This ends up the same as [:], so can't test it.
    // "r[::]"
    "df[1:2, 4]\ndf[1, 2, 3, 4]\ndf[6::7, 4:6, 5, 1:]",
    "[x for a in b if c]\n[x for a in b for c in d if e if g]",
    "{x for a in b if c}\n{x for a in b for c in d if e if g}",
    "(x for a in b if c)\n(x for a in b for c in d if e if g)",
    "{x: y for a in b if c}\n{x: y for a in b for c in d if e if g}",
    "a = 0\na = b = c = 0",
    "(a, b) = (1, 2)\n[x, (y, z)] = something",
    "i: int = 0\ns: str = 'Hello'\nf: float = 4.3\nb: bool = True\nx: Z = 4",
    "i: 'int' = 0\ns: 'str' = 'Hello'\nf: 'float' = 4.3\nb: 'bool' = True",
    "n: None = None\na[0]: List[int] = 0\nb: Dict[str, str]",
    'a += 1\nb *= 4\nc **= 4\nd ^= 10',
    `def alpha(beta, gamma, delta):\n    pass`,
    `def alpha(beta: str, gamma=True, delta: int=0):\n    pass`,
    `@route\n@open('test')\ndef alpha(beta: str, gamma=True, delta: int=0):\n    pass`,
    `@route\n@open('test')\ndef alpha(beta: str, gamma=True, delta: int=0, *args, k=4, num: int=3, **kwargs):\n    a = 0\n    b = 7`,
    "def do_something(a: int) -> str:\n    assert (4 == 3)",
    'lambda x, y=0: x + y',
    '(lambda : None)()',
    "def simple(a, b, c) -> int:\n    return 'Hello world!'\n    return",
    "def simple(a, b, c) -> int:\n    (yield 'Hello world!')\n    (yield)\n    dog = yield b + 4",
    "def simple(a, b, c) -> int:\n    (yield from 'Hello world!')\n    dog = yield from b + 4",
    "def simple(a, b, c) -> int:\n    global alpha\ndef another(e, f):\n    global alpha, beta, gamma",
    //"def simple(a, b, c) -> int:\n    def inner():\n        nonlocal alpha\n        nonlocal alpha, beta, gamma",
    "for x in y:\n    break\n    continue",
    ("try:\n    pass\nexcept NameError:\n    pass" +
        "\nexcept Something() as other:\n    pass\n" +
        "except None as some:\n    pass\nexcept:\n    " +
        "pass\nelse:\n    pass\nfinally:\n    pass"),
    "try:\n    a = 0\nexcept:\n    return",
    "@whatever\nclass a(b, *d, c=0, **e):\n    a = 0\nclass Dog:\n    age = 1\n    name = 'Ada'",
    "if x:\n    pass\nif y:\n    pass\nelse:\n    pass",
    "if a:\n    if j:\n        pass\n    elif k:\n        pass\n    else:\n        pass\nelif b:\n    pass",
    "while x == 0:\n    pass\nwhile y < z:\n    a = 0\nelse:\n    b = a",
    "import x as y, b as c, d\nimport os",
    "from . import x\nfrom .os import y\nfrom ..path import z\nfrom dog.house import a\nfrom cat import b, c as d, e",
    //"import matplotlib.pyplot as plt",
    "with open('filename') as outfile:\n    pass",
    "with open('filename') as outfile, open('file2') as infile, other_context:\n    pass",
    "#hello world!\n# Another comment\n#: int\n\na",
    "#TODO: We need to work harder on this!",
    "a = 0\nprint(a)\nfor x in y:\n    print(b)\n    (max(a, b))",
    "with x():\n    pass",
    "(lambda x: x)()",
    "class Alpha:\n    def beta():\n        '''\n        Hello World!\n        Testing.\n        '''",
    "'test'.replace(1, 2, 3)",
    "'\\n'",
    "'''\ntest'''"
];

function runTests() {
    for (let i = 0; i < TESTS.length; i += 1) {
        let test = TESTS[i];
        editor.textEditor.setCode(test, true);
        editor.blockEditor.setCode(editor.textEditor.getCode(), true);
        console.assert(test.trim() === editor.textEditor.getCode().trim(),
            "\nExpected:\n" + test.trim() + "\n",
            "\nActual:\n" + editor.textEditor.getCode().trim() + "\n");
        if (test.trim() !== editor.textEditor.getCode().trim()) {
            break;
        }
        editor.blockEditor.changed();
        editor.blockEditor.setCode(editor.textEditor.getCode(), true);
        console.assert(test.trim() === editor.textEditor.getCode().trim(),
            "\nExpected:\n" + test.trim() + "\n",
            "\nActual:\n" + editor.textEditor.getCode().trim() + "\n(second trip)");
        if (test.trim() !== editor.textEditor.getCode().trim()) {
            break;
        }
    }
}

//runTests();

function tryGrindleHook() {
    editor.textEditor.setCode('grindlehook.py', `def calculate_rating(name):
    '''
    Returns the customer's credit rating, according to the bank's current
    status, the customer, and the alignment of the stars. This function
    is delicate, and will break after being called once.

    Notes:
        (ghook@1/15/2018): DO NOT TOUCH THIS, I FINALLY GOT IT WORKING.

    Args:
        name (str): A string representing the user's full name.
    Returns:
        int: An integer (0-9) representing the customer's credit rating.
    '''
    c=calculate_rating;setattr(c,'r',lambda:setattr(c,'o',True))
    j={};y=j['CELESTIAL_NAVIGATION_CONSTANT']=10
    j[True]='CELESTIAL_NAVIGATION_CONSTANT'
    x=str(''[:].swapcase);y=y+11,y+9,y+-2,y+-2,y+4,y+-5,y+-1,y+11,y+9,\\
    y+-6,y+-6,y+-1,y+-5,y+3,y+-7,y+7,y+-1,y+-5,y+8,y+-7,y+11,y+1
    z=lambda x,t,o=0:''.join(map(lambda j:x.__getitem__(j+o), t))
    if hasattr(c,'o')and not getattr(c, 'o'): return z(x,y)
    c.o=False;j['CELESTIAL_NAVIGATION_CONSTANT'].bit_length
    d=(lambda:(lambda:None))()();g=globals()
    while d:g['X567S-lumos-17-KLAUS']=((d)if(lambda:None)else(j))
    p=lambda p:sum(map(int, list(str(p))))
    MGC=p(sum(map(lambda v: v[0]*8+ord(v[1]), enumerate(name))))
    while MGC>10:MGC=p(MGC)
    if c:return MGC`);
};

export default editor;