# Windows property store bridge for managed shortcuts and read-only window verification.
if (-not ('Focus.WindowsIdentity' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
namespace Focus {
    public static class WindowsIdentity {
        [StructLayout(LayoutKind.Sequential)] struct PropertyKey {
            public Guid format; public uint id;
            public PropertyKey(uint value) { format = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"); id = value; }
        }
        [StructLayout(LayoutKind.Explicit, Size=24)] struct PropVariant {
            [FieldOffset(0)] public ushort type;
            [FieldOffset(8)] public IntPtr text;
        }
        [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        interface IPropertyStore {
            void GetCount(out uint count);
            void GetAt(uint index, out PropertyKey key);
            void GetValue(ref PropertyKey key, out PropVariant value);
            void SetValue(ref PropertyKey key, ref PropVariant value);
            void Commit();
        }
        [DllImport("shell32.dll", CharSet=CharSet.Unicode, PreserveSig=false)]
        static extern void SHGetPropertyStoreFromParsingName(string path, IntPtr bind, uint flags, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out IPropertyStore store);
        [DllImport("shell32.dll", PreserveSig=false)]
        static extern void SHGetPropertyStoreForWindow(IntPtr window, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out IPropertyStore store);
        [DllImport("ole32.dll")] static extern int PropVariantClear(ref PropVariant value);
        [DllImport("shell32.dll", CharSet=CharSet.Unicode)]
        static extern void SHChangeNotify(uint eventId, uint flags, string item, IntPtr other);
        static string Read(IPropertyStore store, uint id) {
            var key = new PropertyKey(id); PropVariant value;
            store.GetValue(ref key, out value);
            try { return value.type == 31 ? Marshal.PtrToStringUni(value.text) : null; }
            finally { PropVariantClear(ref value); }
        }
        public static void SetShortcutId(string path, string appId) {
            var iid = typeof(IPropertyStore).GUID; IPropertyStore store;
            SHGetPropertyStoreFromParsingName(path, IntPtr.Zero, 2, ref iid, out store);
            var key = new PropertyKey(5);
            var value = new PropVariant { type=31, text=Marshal.StringToCoTaskMemUni(appId) };
            try { store.SetValue(ref key, ref value); store.Commit(); }
            finally { PropVariantClear(ref value); Marshal.ReleaseComObject(store); }
            SHChangeNotify(0x2000, 0x0005, path, IntPtr.Zero);
        }
        public static string ReadWindowProperty(IntPtr window, uint id) {
            var iid = typeof(IPropertyStore).GUID; IPropertyStore store;
            SHGetPropertyStoreForWindow(window, ref iid, out store);
            try { return Read(store, id); }
            finally { Marshal.ReleaseComObject(store); }
        }
    }
}
'@
}
