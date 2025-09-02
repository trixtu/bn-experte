import ChatComponent from "@/components/chat";
import FileUploadComponent from "@/components/file-upload";

export default function Home() {
  return (
    <div>
      <div className="min-h-screen w-screen flex">
        <div className="hidden lg:flex w-[30vw] min-h-screen p-8 justify-center items-center">
          <FileUploadComponent />
        </div>
        <div className="w-full lg:w-[70vw] min-h-screen border-l-2">
          <ChatComponent />
        </div>
      </div>
    </div>
  );
}
