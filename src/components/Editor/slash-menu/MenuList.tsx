import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react'

export const MenuList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command(item)
    }
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
        return true
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden min-w-[220px] z-50 py-1">
      {props.items.length ? (
        <div className="px-1">
          {props.items.map((item: any, index: number) => (
            <button
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-md transition-colors ${
                index === selectedIndex ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
              key={index}
              onClick={() => selectItem(index)}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 bg-white shadow-sm ${index === selectedIndex ? 'border-blue-200' : ''}`}>
                {item.icon}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{item.title}</span>
                {item.description && <span className="text-[10px] text-slate-400 -mt-0.5">{item.description}</span>}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-4 py-2 text-sm text-slate-400 italic">No se encontraron resultados</div>
      )}
    </div>
  )
})

MenuList.displayName = 'MenuList'
