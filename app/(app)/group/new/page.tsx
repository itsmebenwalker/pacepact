import CreateGroupForm from '@/components/groups/CreateGroupForm'

export default function NewGroupPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-8">Create a group</h1>
      <CreateGroupForm />
    </div>
  )
}
