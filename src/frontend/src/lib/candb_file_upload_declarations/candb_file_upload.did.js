export const idlFactory = ({ IDL }) => {
  const CandyShared = IDL.Rec();
  const Tree = IDL.Rec();
  const File = IDL.Record({ 'content' : IDL.Vec(IDL.Nat8), 'name' : IDL.Text });
  const PK = IDL.Text;
  const SK = IDL.Text;
  const RemoveOptions = IDL.Record({ 'pk' : PK, 'sk' : SK });
  const ScanOptions = IDL.Record({
    'pk' : PK,
    'limit' : IDL.Nat,
    'ascending' : IDL.Opt(IDL.Bool),
    'skLowerBound' : SK,
    'skUpperBound' : SK,
  });
  const AttributeKey = IDL.Text;
  const AttributeValuePrimitive = IDL.Variant({
    'int' : IDL.Int,
    'float' : IDL.Float64,
    'bool' : IDL.Bool,
    'text' : IDL.Text,
  });
  const PropertyShared = IDL.Record({
    'value' : CandyShared,
    'name' : IDL.Text,
    'immutable' : IDL.Bool,
  });
  CandyShared.fill(
    IDL.Variant({
      'Int' : IDL.Int,
      'Map' : IDL.Vec(IDL.Tuple(IDL.Text, CandyShared)),
      'Nat' : IDL.Nat,
      'Set' : IDL.Vec(CandyShared),
      'Nat16' : IDL.Nat16,
      'Nat32' : IDL.Nat32,
      'Nat64' : IDL.Nat64,
      'Blob' : IDL.Vec(IDL.Nat8),
      'Bool' : IDL.Bool,
      'Int8' : IDL.Int8,
      'Ints' : IDL.Vec(IDL.Int),
      'Nat8' : IDL.Nat8,
      'Nats' : IDL.Vec(IDL.Nat),
      'Text' : IDL.Text,
      'Bytes' : IDL.Vec(IDL.Nat8),
      'Int16' : IDL.Int16,
      'Int32' : IDL.Int32,
      'Int64' : IDL.Int64,
      'Option' : IDL.Opt(CandyShared),
      'Floats' : IDL.Vec(IDL.Float64),
      'Float' : IDL.Float64,
      'Principal' : IDL.Principal,
      'Array' : IDL.Vec(CandyShared),
      'ValueMap' : IDL.Vec(IDL.Tuple(CandyShared, CandyShared)),
      'Class' : IDL.Vec(PropertyShared),
    })
  );
  const Color = IDL.Variant({ 'B' : IDL.Null, 'R' : IDL.Null });
  const AttributeValueRBTreeValue = IDL.Variant({
    'int' : IDL.Int,
    'float' : IDL.Float64,
    'tuple' : IDL.Vec(AttributeValuePrimitive),
    'blob' : IDL.Vec(IDL.Nat8),
    'bool' : IDL.Bool,
    'candy' : CandyShared,
    'text' : IDL.Text,
    'arrayBool' : IDL.Vec(IDL.Bool),
    'arrayText' : IDL.Vec(IDL.Text),
    'arrayInt' : IDL.Vec(IDL.Int),
    'arrayFloat' : IDL.Vec(IDL.Float64),
  });
  Tree.fill(
    IDL.Variant({
      'leaf' : IDL.Null,
      'node' : IDL.Tuple(
        Color,
        Tree,
        IDL.Tuple(IDL.Text, IDL.Opt(AttributeValueRBTreeValue)),
        Tree,
      ),
    })
  );
  const AttributeValue = IDL.Variant({
    'int' : IDL.Int,
    'float' : IDL.Float64,
    'tuple' : IDL.Vec(AttributeValuePrimitive),
    'blob' : IDL.Vec(IDL.Nat8),
    'bool' : IDL.Bool,
    'candy' : CandyShared,
    'text' : IDL.Text,
    'tree' : Tree,
    'arrayBool' : IDL.Vec(IDL.Bool),
    'arrayText' : IDL.Vec(IDL.Text),
    'arrayInt' : IDL.Vec(IDL.Int),
    'arrayFloat' : IDL.Vec(IDL.Float64),
  });
  return IDL.Service({
    'create' : IDL.Func([File], [], []),
    'download_wrapper' : IDL.Func([IDL.Text], [IDL.Vec(IDL.Nat8)], []),
    'get' : IDL.Func([IDL.Text], [IDL.Opt(File)], ['query']),
    'remove' : IDL.Func([RemoveOptions], [IDL.Opt(File)], []),
    'scan' : IDL.Func([ScanOptions], [IDL.Vec(IDL.Opt(File))], ['query']),
    'update' : IDL.Func(
        [
          IDL.Record({
            'pk' : PK,
            'sk' : SK,
            'attributesToUpdate' : IDL.Vec(
              IDL.Tuple(AttributeKey, AttributeValue)
            ),
          }),
        ],
        [IDL.Opt(File)],
        [],
      ),
    'upload_wrapper' : IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
