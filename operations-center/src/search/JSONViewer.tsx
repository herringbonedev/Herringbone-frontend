type Props = { data: any }

export function JsonViewer({ data }: Props) {
  return (
    <pre className="json-viewer">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}
